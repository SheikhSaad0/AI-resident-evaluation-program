import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const prisma = getPrismaClient(req);

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'A valid evaluation ID is required.' });
    }

    // --- GET Request Handler ---
    if (req.method === 'GET') {
        try {
            console.log(`[Evaluation GET] Fetching job with ID: ${id}`);
            
            const job = await prisma.job.findUnique({
                where: { id },
                // Include all possible supervisor and resident relations
                include: { 
                    resident: true,
                    attending: true,
                    programDirector: true 
                }
            });

            if (job) {
                console.log(`[Evaluation GET] Job ${id} found successfully.`);
                res.status(200).json(job);
            } else {
                console.log(`[Evaluation GET] Job ${id} not found.`);
                res.status(404).json({ message: 'Evaluation not found.' });
            }
        } catch (error) {
            console.error(`[Evaluation GET] Error fetching evaluation ${id}:`, error);
            res.status(500).json({ message: 'An error occurred while fetching the evaluation.' });
        }
        return;
    }

    // --- PUT Request Handler ---
    if (req.method === 'PUT') {
        try {
            console.log(`[Evaluation PUT] Attempting to update job ${id}.`);
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
            
            // This is the critical new logic.
            // We check the type of the supervisor and save the ID to the correct field.
            if (typeof attendingId !== 'undefined') {
                if (attendingType === 'Program Director') {
                    dataToUpdate.programDirectorId = attendingId;
                    dataToUpdate.attendingId = null; // Ensure the other key is cleared
                } else { // Default to 'Attending'
                    dataToUpdate.attendingId = attendingId;
                    dataToUpdate.programDirectorId = null; // Ensure the other key is cleared
                }
            }

            if (Object.keys(dataToUpdate).length === 0) {
                return res.status(400).json({ message: 'No update data provided.' });
            }

            const updatedJob = await prisma.job.update({
                where: { id },
                data: dataToUpdate,
            });
            
            console.log(`[Evaluation PUT] Job ${id} updated successfully.`);
            res.status(200).json(updatedJob);
        } catch (error) {
            console.error(`[Evaluation PUT] Failed to update evaluation ${id}:`, error);
            res.status(500).json({ message: 'An error occurred while updating the evaluation.' });
        }
        return;
    }

    // --- DELETE Request Handler ---
    if (req.method === 'DELETE') {
        try {
            console.log(`[Evaluation DELETE] Deleting job with ID: ${id}`);
            await prisma.job.delete({ where: { id } });
            console.log(`[Evaluation DELETE] Successfully deleted job: ${id}`);
            res.status(204).end();
        } catch (error) {
            console.error(`[Evaluation DELETE] Failed to delete evaluation ${id}:`, error);
            res.status(500).json({ message: 'Failed to delete evaluation.' });
        }
        return;
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
