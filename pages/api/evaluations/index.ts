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

            const evaluations = jobs.map(job => ({
                id: job.id,
                surgery: job.surgeryName,
                date: new Date(job.createdAt).toLocaleDateString(),
                residentName: job.resident?.name, // Get name from the related resident
                withVideo: job.withVideo,
                videoAnalysis: job.videoAnalysis,
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