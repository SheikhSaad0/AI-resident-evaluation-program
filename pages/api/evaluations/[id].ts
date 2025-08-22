// pages/api/evaluations/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';
import { generateV4ReadSignedUrl } from '../../../lib/r2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const prisma = getPrismaClient(req);

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'A valid evaluation ID is required.' });
    }

    if (req.method === 'GET') {
        try {
            const job = await prisma.job.findUnique({
                where: { id },
                include: { resident: true, attending: true, programDirector: true }
            });

            if (!job) {
                return res.status(404).json({ message: 'Evaluation not found.' });
            }

            let readableUrl = null;
            if (job.gcsObjectPath) {
                readableUrl = await generateV4ReadSignedUrl(job.gcsObjectPath);
            }
            
            res.status(200).json({ ...job, readableUrl });

        } catch (error) {
            console.error(`[Evaluation GET] Top-level error for job ${id}:`, error);
            res.status(500).json({ message: 'An error occurred while fetching the evaluation.' });
        }
        return;
    }

    if (req.method === 'PUT') {
        try {
            const { updatedEvaluation, attendingId, attendingType } = req.body;
            const dataToUpdate: {
                result?: any;
                status?: string;
                attendingId?: string | null;
                programDirectorId?: string | null;
            } = {};

            if (updatedEvaluation) {
                dataToUpdate.result = updatedEvaluation;
                if (typeof updatedEvaluation.isFinalized !== 'undefined') {
                    dataToUpdate.status = updatedEvaluation.isFinalized ? 'complete' : 'draft';
                }
            }
            
            if (typeof attendingId !== 'undefined') {
                if (attendingType === 'Program Director') {
                    dataToUpdate.programDirectorId = attendingId;
                    dataToUpdate.attendingId = null; 
                } else { 
                    dataToUpdate.attendingId = attendingId;
                    dataToUpdate.programDirectorId = null; 
                }
            }

            if (Object.keys(dataToUpdate).length === 0) {
                return res.status(400).json({ message: 'No update data provided.' });
            }

            const updatedJob = await prisma.job.update({ where: { id }, data: dataToUpdate });
            res.status(200).json(updatedJob);
        } catch (error) {
            res.status(500).json({ message: 'An error occurred while updating the evaluation.' });
        }
        return;
    }

    if (req.method === 'DELETE') {
        try {
            await prisma.job.delete({ where: { id } });
            res.status(204).end();
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete evaluation.' });
        }
        return;
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}