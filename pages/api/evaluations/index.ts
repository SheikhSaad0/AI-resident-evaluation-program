import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const jobs = await prisma.job.findMany({
                orderBy: { createdAt: 'desc' },
                include: { resident: true }, // Include resident data
            });

            const evaluations = await Promise.all(jobs.map(async (job) => {
                const latestStatus = job.status;

                let score = undefined;
                let isFinalized = false;

                // Check if job.result is a string and parse it, otherwise use it as is.
                let resultData: any;
                if (job.result && typeof job.result === 'string') {
                    try {
                        resultData = JSON.parse(job.result);
                    } catch (e) {
                        console.error("Failed to parse job result JSON:", e);
                        resultData = {};
                    }
                } else if (job.result && typeof job.result === 'object') {
                    resultData = job.result;
                }

                if (resultData) {
                    isFinalized = resultData.isFinalized || false;
                    const stepScores = Object.values(resultData)
                        .map((step: any) => step?.score)
                        .filter(s => typeof s === 'number' && s > 0);
                    if (stepScores.length > 0) {
                        score = stepScores.reduce((a, b) => a + b, 0) / stepScores.length;
                    }
                }

                return {
                    id: job.id,
                    surgery: job.surgeryName,
                    date: new Date(job.createdAt).toLocaleDateString(),
                    residentName: job.resident?.name,
                    residentId: job.residentId,
                    score: score,
                    status: latestStatus || job.status,
                    type: job.withVideo ? 'video' : 'audio',
                    isFinalized: isFinalized,
                    videoAnalysis: job.videoAnalysis,
                };
            }));

            res.status(200).json(evaluations);
        } catch (error) {
            console.error("Error fetching evaluations:", error);
            res.status(500).json({ error: 'Failed to fetch evaluations' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}