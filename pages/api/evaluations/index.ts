import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Set Cache-Control header to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Date', new Date().toUTCString());

    if (req.method === 'GET') {
        const prisma = getPrismaClient(req);
        try {
            const jobs = await prisma.job.findMany({
                orderBy: { createdAt: 'desc' },
                include: { resident: true },
            });

            const evaluations = await Promise.all(jobs.map(async (job) => {
                let score = undefined;
                let isFinalized = false;
                let resultData: any = null;

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
                    if (isFinalized && typeof resultData.finalScore === 'number') {
                        score = resultData.finalScore;
                    } else {
                        const stepScores = Object.values(resultData)
                            .map((step: any) => step?.score)
                            .filter(s => typeof s === 'number' && s > 0);
                        if (stepScores.length > 0) {
                            score = stepScores.reduce((a, b) => a + b, 0) / stepScores.length;
                        }
                    }
                }

                return {
                    id: job.id,
                    surgery: job.surgeryName,
                    date: new Date(job.createdAt).toLocaleString(),
                    residentName: job.resident?.name,
                    residentId: job.residentId,
                    score: score,
                    status: job.status,
                    type: job.withVideo ? 'video' : 'audio',
                    isFinalized: isFinalized,
                    videoAnalysis: job.videoAnalysis,
                    result: resultData, 
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