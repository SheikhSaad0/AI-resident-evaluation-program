import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { 
            gcsUrl, 
            gcsObjectPath, 
            surgeryName, 
            residentName, 
            additionalContext, 
            withVideo, 
            videoAnalysis 
        } = req.body;

        if (!gcsUrl || !surgeryName || !gcsObjectPath) {
            return res.status(400).json({ message: 'gcsUrl, gcsObjectPath, and surgeryName are required.' });
        }

        const job = await prisma.job.create({
            data: {
                status: 'pending', // The job is now queued as 'pending'
                gcsUrl,
                gcsObjectPath,
                surgeryName,
                residentName,
                additionalContext,
                withVideo: !!withVideo,
                videoAnalysis: !!videoAnalysis,
            },
        });

        // The immediate processing trigger has been removed.
        // The GitHub Actions cron will handle it.

        res.status(202).json({ jobId: job.id });

    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}