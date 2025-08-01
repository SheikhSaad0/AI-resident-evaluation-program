// pages/api/evaluations/delete-many.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const prisma = getPrismaClient(req);
    const { ids } = req.body;

    console.log('[Delete Many] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[Delete Many] IDs to delete:', ids);

    if (!Array.isArray(ids) || ids.length === 0) {
        console.log('[Delete Many] Invalid IDs array');
        return res.status(400).json({ message: 'An array of evaluation IDs is required.' });
    }

    try {
        console.log('[Delete Many] Deleting jobs with IDs:', ids);
        
        const deleteResult = await prisma.job.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
        
        console.log('[Delete Many] Delete result:', deleteResult);
        console.log('[Delete Many] Successfully deleted', deleteResult.count, 'jobs');
        
        res.status(204).end(); // No Content
    } catch (error) {
        console.error('[Delete Many] Failed to delete evaluations:', error);
        console.error('[Delete Many] Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ message: 'Failed to delete evaluations' });
    }
}