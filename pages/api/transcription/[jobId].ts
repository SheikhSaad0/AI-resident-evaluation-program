import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'A valid jobId must be provided.' });
    }

    try {
        // Fetch only the 'result' field from the database for efficiency
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { result: true },
        });

        if (!job || !job.result) {
            return res.status(404).json({ error: 'Transcription not found for this job.' });
        }

        const resultData = JSON.parse(job.result);
        const transcription = resultData.transcription || 'Transcription not available.';

        // Set header to indicate plain text and send only the transcription string
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(transcription);

    } catch (error) {
        console.error(`Error fetching transcription for job ${jobId}:`, error);
        res.status(500).json({ error: 'Failed to fetch transcription.' });
    }
}