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

        // This robust check ensures gcsObjectPath is present and valid
        if (!gcsUrl || !surgeryName || !gcsObjectPath || typeof gcsObjectPath !== 'string' || gcsObjectPath.trim() === '') {
            return res.status(400).json({ message: 'A valid gcsUrl, gcsObjectPath, and surgeryName are required.' });
        }

        // Create the job in the database with all the necessary data
        const job = await prisma.job.create({
            data: {
                status: 'pending', // This line is crucial. It queues the job for the cron.
                gcsUrl,
                gcsObjectPath,
                surgeryName,
                residentName,
                additionalContext,
                withVideo: !!withVideo,
                videoAnalysis: !!videoAnalysis,
            },
        });

        res.status(202).json({ jobId: job.id });

    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}