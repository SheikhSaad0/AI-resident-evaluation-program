import { NextApiRequest, NextApiResponse } from 'next';
// REMOVE THIS LINE:
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// ADD THIS LINE INSTEAD:
import { prisma } from '../../../lib/prisma';

//const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const jobs = await prisma.job.findMany({
                where: {
                    status: 'complete',
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            const evaluations = jobs.map(job => ({
                id: job.id,
                surgery: job.surgeryName,
                date: new Date(job.createdAt).toLocaleDateString(),
                residentName: job.residentName,
                withVideo: job.withVideo,
                videoAnalysis: job.videoAnalysis, // FIX: Include the videoAnalysis flag
            }));

            res.status(200).json(evaluations);
        } catch (error) {
            console.error("Error fetching evaluations:", error);
            res.status(500).json({ error: 'Failed to fetch evaluations' });
        }
    } else if (req.method === 'DELETE') {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ message: 'A valid evaluation ID must be provided.' });
        }
        try {
            await prisma.job.delete({
                where: { id },
            });
            res.status(200).json({ message: 'Evaluation deleted successfully.' });
        } catch (error) {
            console.error(`Failed to delete evaluation ${id}:`, error);
            res.status(500).json({ message: 'Failed to delete evaluation.' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}