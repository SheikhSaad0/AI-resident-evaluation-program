import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';
import { generateV4ReadSignedUrl } from '../../../lib/gcs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'A valid jobId must be provided.' });
    }
    
    const prisma = getPrismaClient(req);

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found.' });
        }
        
        if (job.status === 'complete' && job.gcsObjectPath) {
            const readableUrl = await generateV4ReadSignedUrl(job.gcsObjectPath);
            let result = null;
            if (job.result) {
                try {
                    // Try to parse as JSON first
                    result = JSON.parse(job.result as string);
                } catch (parseError) {
                    // If JSON parsing fails, use the raw result
                    console.warn(`Failed to parse job result as JSON for job ${jobId}:`, parseError);
                    result = job.result;
                }
            }

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