import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

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
        
        // If the job is complete, process the result to avoid sending the large transcription
        if (job.status === 'complete' && job.result) {
            const resultData = JSON.parse(job.result);
            
            // Create a copy of the result and delete the large transcription property
            const evaluationData = { ...resultData };
            delete evaluationData.transcription;

            // Create the final payload for the response
            const responsePayload = {
                ...job,
                // Replace the original massive result string with the smaller evaluation data object
                result: evaluationData, 
            };

            return res.status(200).json(responsePayload);
        }

        // For jobs that are not complete, the 'result' field is null, so it's safe to send as-is
        return res.status(200).json(job);

    } catch (error) {
        console.error(`Error fetching status for job ${jobId}:`, error);
        res.status(500).json({ error: 'Failed to fetch job status.' });
    }
}