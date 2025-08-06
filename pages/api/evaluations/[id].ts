import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const prisma = getPrismaClient(req);

    // Validate that an ID was provided in the URL
    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'A valid evaluation ID is required.' });
    }

    // --- GET Request Handler ---
    // Fetches the detailed data for a single evaluation/job.
    if (req.method === 'GET') {
        try {
            console.log(`[Evaluation GET] Fetching job with ID: ${id}`);
            
            const job = await prisma.job.findUnique({
                where: { id },
                // Include related resident and attending data in the response
                include: { 
                    resident: true,
                    attending: true 
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
    // Handles all updates to an evaluation, including content, status, and the assigned attending.
    if (req.method === 'PUT') {
        try {
            console.log(`[Evaluation PUT] Attempting to update job ${id}.`);
            console.log('[Evaluation PUT] Request body:', JSON.stringify(req.body, null, 2));
            
            const { updatedEvaluation, attendingId } = req.body;

            // Prepare an object to hold only the data that needs to be updated.
            const dataToUpdate: {
                result?: any;
                status?: string;
                attendingId?: string | null;
            } = {};

            // If the main evaluation content (the 'result' JSON) is being updated...
            if (updatedEvaluation) {
                dataToUpdate.result = updatedEvaluation;
                // Also update the job's overall status based on the finalization flag within the result.
                if (typeof updatedEvaluation.isFinalized !== 'undefined') {
                    dataToUpdate.status = updatedEvaluation.isFinalized ? 'complete' : 'draft';
                }
            }
            
            // If the attending physician is being updated...
            // This allows setting it to a new ID or to null to unassign.
            if (typeof attendingId !== 'undefined') {
                dataToUpdate.attendingId = attendingId;
            }

            // Ensure there's actually something to update to prevent empty database calls.
            if (Object.keys(dataToUpdate).length === 0) {
                console.warn(`[Evaluation PUT] Update request for job ${id} received, but no valid data to update.`);
                return res.status(400).json({ message: 'No update data provided.' });
            }

            console.log(`[Evaluation PUT] Updating job ${id} with data:`, JSON.stringify(dataToUpdate, null, 2));

            // Execute the update in the database.
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
    // Permanently removes an evaluation from the database.
    if (req.method === 'DELETE') {
        try {
            console.log(`[Evaluation DELETE] Deleting job with ID: ${id}`);
            
            await prisma.job.delete({
                where: { id },
            });
            
            console.log(`[Evaluation DELETE] Successfully deleted job: ${id}`);
            // Send a 204 No Content response on successful deletion.
            res.status(204).end();
        } catch (error) {
            console.error(`[Evaluation DELETE] Failed to delete evaluation ${id}:`, error);
            res.status(500).json({ message: 'Failed to delete evaluation.' });
        }
        return;
    }

    // --- Method Not Allowed Handler ---
    // If the request uses a method other than GET, PUT, or DELETE, reject it.
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
