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
        console.log('[Evaluations API] Fetching evaluations using job.findMany()');
        
        try {
            // The fix is to include the 'attending' and 'programDirector' relations
            // in the Prisma query. This makes their data available in the 'job' object.
            const jobs = await prisma.job.findMany({
                orderBy: { createdAt: 'desc' },
                include: { 
                    resident: true,
                    attending: true,        // <-- ADDED
                    programDirector: true,  // <-- ADDED
                },
            });

            console.log(`[Evaluations API] Successfully fetched ${jobs.length} jobs`);

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

                // The second part of the fix is to add the supervisor IDs
                // to the returned object, making them available to the front end.
                return {
                    id: job.id,
                    surgery: job.surgeryName,
                    date: new Date(job.createdAt).toLocaleString(),
                    residentName: job.resident?.name,
                    residentId: job.residentId,
                    attendingId: job.attendingId,            // <-- ADDED
                    programDirectorId: job.programDirectorId,  // <-- ADDED
                    score: score,
                    status: job.status,
                    type: job.withVideo ? 'video' : 'audio',
                    isFinalized: isFinalized,
                    videoAnalysis: job.videoAnalysis,
                    result: resultData, 
                };
            }));

            console.log(`[Evaluations API] Successfully processed ${evaluations.length} evaluations`);
            res.status(200).json(evaluations);
        } catch (error) {
            console.error("[Evaluations API] Error fetching evaluations:", error);
            res.status(500).json({ 
                error: 'Failed to fetch evaluations',
            });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
