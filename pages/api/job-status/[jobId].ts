import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateV4ReadSignedUrl } from '../../../lib/gcs'; // Corrected import path

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'A valid jobId must be provided.' });
    }

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found.' });
        }
        
        if (job.status === 'complete' && job.gcsObjectPath) {
            const readableUrl = await generateV4ReadSignedUrl(job.gcsObjectPath);
            const result = job.result ? JSON.parse(job.result as string) : null;

            return res.status(200).json({
                ...job,
                result,
                readableUrl,
            });
        }

        return res.status(200).json(job);

    } catch (error) {
        console.error(`Error fetching status for job ${jobId}:`, error);
        res.status(500).json({ error: 'Failed to fetch job status.' });
    }
}