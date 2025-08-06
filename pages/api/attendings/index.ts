// pages/api/attendings/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const prisma = getPrismaClient(req);
    // Check for a query parameter to distinguish between management view and supervisor selection
    const { management } = req.query;

    if (req.method === 'GET') {
        try {
            // If for management page, only return true attendings
            if (management === 'true') {
                const attendings = await prisma.attending.findMany({
                    orderBy: { name: 'asc' },
                });
                // The manager component doesn't need a 'type' field, as it knows it's dealing with attendings.
                res.status(200).json(attendings);
                return;
            }

            // Default behavior: Fetch both for supervisor selection dropdowns
            const [attendings, programDirectors] = await Promise.all([
                prisma.attending.findMany(),
                prisma.programDirector.findMany()
            ]);

            const formattedAttendings = attendings.map(attending => ({
                ...attending,
                type: 'Attending'
            }));

            const formattedProgramDirectors = programDirectors.map(pd => ({
                ...pd,
                type: 'Program Director'
            }));

            const supervisors = [...formattedAttendings, ...formattedProgramDirectors];
            supervisors.sort((a, b) => a.name.localeCompare(b.name));

            res.status(200).json(supervisors);
        } catch (error) {
            console.error('[Supervisors GET] Error fetching supervisors:', error);
            res.status(500).json({ message: 'Failed to fetch supervisors' });
        }
        return;
    }
    
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