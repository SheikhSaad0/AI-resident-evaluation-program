import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';
import { Job, Resident } from '@prisma/client';

type JobWithResident = Job & { resident: Resident | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (req.method !== 'GET' || typeof id !== 'string') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    const prisma = getPrismaClient(req);

    try {
        const jobs = await prisma.job.findMany({
            where: {
                attendingId: id,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                resident: true,
            },
        });

        const evaluations = jobs.map((job: JobWithResident) => {
            let score = undefined;
            let isFinalized = false;

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
                withVideo: job.withVideo,
                videoAnalysis: job.videoAnalysis,
                score: score,
                status: job.status,
                type: job.withVideo ? 'video' : 'audio',
                isFinalized: isFinalized,
                result: resultData
            };
        });

        res.status(200).json(evaluations);
    } catch (error) {
        console.error(`Error fetching evaluations for attending ${id}:`, error);
        res.status(500).json({ message: 'Failed to fetch evaluations' });
    }
}