import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { Client } from "@upstash/qstash";

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const {
            gcsUrl,
            gcsObjectPath,
            surgeryName,
            residentId, // Changed from residentName
            additionalContext,
            withVideo,
            videoAnalysis
        } = req.body;

        const job = await prisma.job.create({
            data: {
                status: 'pending',
                gcsUrl,
                gcsObjectPath,
                surgeryName,
                residentId, // Storing the ID
                additionalContext,
                withVideo: !!withVideo,
                videoAnalysis: !!videoAnalysis,
            },
        });

        const baseUrl = process.env.QSTASH_URL_OVERRIDE || 
                        `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
                        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
        
        const destinationUrl = `${baseUrl}/api/process`;

        await qstashClient.publishJSON({
          url: destinationUrl,
          body: { jobId: job.id },
        });

        res.status(202).json({ jobId: job.id });

    } catch (error) {
        console.error('Error submitting job:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ message: `Error submitting job: ${errorMessage}` });
    }
}