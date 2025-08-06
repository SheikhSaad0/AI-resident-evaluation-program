import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const prisma = getPrismaClient(req);

    if (req.method === 'GET') {
        try {
            // Fetch both attendings and program directors in parallel
            const [attendings, programDirectors] = await Promise.all([
                prisma.attending.findMany(),
                prisma.programDirector.findMany()
            ]);

            // Map attendings to a consistent format
            const formattedAttendings = attendings.map(attending => ({
                ...attending,
                type: 'Attending' // Add a type identifier
            }));

            // Map program directors to the same consistent format
            const formattedProgramDirectors = programDirectors.map(pd => ({
                ...pd,
                type: 'Program Director' // Add a type identifier
            }));

            // Combine the two lists into a single "supervisors" list
            const supervisors = [...formattedAttendings, ...formattedProgramDirectors];

            // Sort the combined list alphabetically by name
            supervisors.sort((a, b) => a.name.localeCompare(b.name));

            res.status(200).json(supervisors);
        } catch (error) {
            console.error('[Supervisors GET] Error fetching supervisors:', error);
            res.status(500).json({ message: 'Failed to fetch supervisors' });
        }
        return;
    }
    
    // The POST handler remains the same for creating new, dedicated attendings.
    if (req.method === 'POST') {
        try {
            const newAttending = await prisma.attending.create({
                data: req.body,
            });
            res.status(201).json(newAttending);
        } catch (error) {
            console.error('[Attendings POST] Error creating attending:', error);
            res.status(500).json({ message: 'Failed to create attending' });
        }
        return;
    }

    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
