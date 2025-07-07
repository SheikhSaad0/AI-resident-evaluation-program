import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Secure this endpoint with the same cron secret
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Find the oldest pending job
        const jobToProcess = await prisma.job.findFirst({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
        });

        if (!jobToProcess) {
            return res.status(200).json({ message: 'No pending jobs to process.' });
        }

        console.log(`[Cron] Found pending job ${jobToProcess.id}. Triggering processing.`);

        // Get the base URL (works for Vercel and local)
        const host = req.headers.host || 'localhost:3000';
        const protocol = /^localhost/.test(host) ? 'http' : 'https';
        const processUrl = new URL(`${protocol}://${host}/api/process-job?jobId=${jobToProcess.id}`);

        // Trigger the actual processing endpoint asynchronously.
        // We use a "fire-and-forget" approach here.
        fetch(processUrl.href, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        }).catch(error => {
            // This error is for the fetch call itself, not the job processing
            console.error(`[Cron] Failed to trigger processing for job ${jobToProcess.id}:`, error);
        });
        
        // Immediately respond that the cron job has triggered a process
        res.status(202).json({ message: `Processing triggered for job ${jobToProcess.id}` });

    } catch (error) {
        console.error('[Cron] Error finding pending job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}