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

        const host = req.headers.host || 'localhost:3000';
        const protocol = /^localhost/.test(host) ? 'http' : 'https';
        const processUrl = new URL(`${protocol}://${host}/api/process-job?jobId=${job.id}`);

        fetch(processUrl.href, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CRON_SECRET}`
            }
        }).catch(error => {
            console.error('[Trigger Error] Failed to start job processing:', error);
        });

        res.status(202).json({ jobId: job.id });

    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: errorMessage });
    }
}