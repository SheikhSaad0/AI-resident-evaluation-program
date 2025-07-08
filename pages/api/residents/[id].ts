import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (typeof id !== 'string') {
        return res.status(400).json({ message: 'Resident ID must be a string.' });
    }

    if (req.method === 'GET') {
        try {
            const resident = await prisma.resident.findUnique({
                where: { id },
            });
            if (!resident) {
                return res.status(404).json({ message: 'Resident not found.' });
            }
            res.status(200).json(resident);
        } catch (error) {
            console.error(`Error fetching resident ${id}:`, error);
            res.status(500).json({ message: `Failed to fetch resident ${id}` });
        }
    } else if (req.method === 'DELETE') {
        try {
            await prisma.resident.delete({
                where: { id },
            });
            res.status(200).json({ message: 'Resident deleted successfully.' });
        } catch (error) {
            console.error(`Error deleting resident ${id}:`, error);
            res.status(500).json({ message: `Failed to delete resident ${id}` });
        }
    } else {
        res.setHeader('Allow', ['GET', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}