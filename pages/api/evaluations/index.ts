import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const jobs = await prisma.job.findMany({
                where: { status: 'complete' },
                orderBy: { createdAt: 'desc' },
                include: { resident: true }, // Include resident data
            });

            const evaluations = jobs.map(job => {
                let score = undefined;
                if (job.result && typeof job.result === 'object' && !Array.isArray(job.result)) {
                    // Safely parse score from the result JSON
                    const resultData = job.result as any;
                    const totalScore = Object.values(resultData).reduce((acc: number, step: any) => {
                        if (step && typeof step.score === 'number' && step.score > 0) {
                            return acc + step.score;
                        }
                        return acc;
                    }, 0);
                    const stepCount = Object.values(resultData).filter((step: any) => step && typeof step.score === 'number' && step.score > 0).length;
                    if (stepCount > 0) {
                        score = totalScore / stepCount;
                    }
                }

                return {
                    id: job.id,
                    surgery: job.surgeryName,
                    date: new Date(job.createdAt).toLocaleDateString(),
                    residentName: job.resident?.name,
                    withVideo: job.withVideo,
                    videoAnalysis: job.videoAnalysis,
                    score: score,
                    status: job.status,
                    type: job.withVideo ? 'video' : 'audio',
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