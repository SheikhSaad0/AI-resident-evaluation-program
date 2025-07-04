import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { jobId } = req.query;

    if (typeof jobId !== 'string') {
        return res.status(400).json({ message: 'jobId must be a string.' });
    }

    try {
        const job = await prisma.job.findUnique({ where: { id: jobId } });

        if (!job) {
            return res.status(404).json({ message: 'Job not found.' });
        }

        let result = undefined;
        if (job.result) {
            try {
                result = JSON.parse(job.result);
            } catch {
                result = job.result;
            }
        }

        res.status(200).json({
            id: job.id,
            status: job.status,
            gcsUrl: job.gcsUrl,
            withVideo: job.withVideo,
            thumbnailUrl: job.thumbnailUrl,
            result,
            error: job.error,
        });
    } catch (error) {
        console.error(`Error fetching job status for ${jobId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}