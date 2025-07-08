import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { processJob } from '../../lib/process-job'; // Import the new function

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
                status: 'pending',
                gcsUrl,
                gcsObjectPath,
                surgeryName,
                residentName,
                additionalContext,
                withVideo: !!withVideo,
                videoAnalysis: !!videoAnalysis,
            },
        });

        // Immediately start processing the job in the background
        processJob(job);

        // Immediately respond to the client with the new job ID
        res.status(202).json({ jobId: job.id });

    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}