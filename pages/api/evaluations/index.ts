import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const jobs = await prisma.job.findMany({
                orderBy: { createdAt: 'desc' },
                include: { resident: true }, // Include resident data
            });

            const evaluations = jobs.map(job => {
                let score = undefined;
                let isFinalized = false;
                if (job.result && typeof job.result === 'object' && !Array.isArray(job.result)) {
                    // Safely parse score and isFinalized from the result JSON
                    const resultData = job.result as any;
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
                    residentId: job.residentId,
                    residentName: job.resident?.name,
                    withVideo: job.withVideo,
                    videoAnalysis: job.videoAnalysis,
                    score: score,
                    status: job.status,
                    type: job.withVideo ? 'video' : 'audio',
                    isFinalized: isFinalized
                };
            });

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