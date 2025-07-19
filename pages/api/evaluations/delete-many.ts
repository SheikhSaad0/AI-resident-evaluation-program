// pages/api/evaluations/delete-many.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const prisma = await getPrismaClient();
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'An array of evaluation IDs is required.' });
    }

    try {
        await prisma.job.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
        res.status(204).end(); // No Content
    } catch (error) {
        console.error('Failed to delete evaluations:', error);
        res.status(500).json({ message: 'Failed to delete evaluations' });
    }
}