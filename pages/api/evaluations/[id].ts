// pages/api/evaluations/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const prisma = getPrismaClient(req);

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'A valid evaluation ID is required.' });
    }

    // --- GET Request Handler ---
    // This fetches the data for your results page.
    if (req.method === 'GET') {
        try {
            console.log('[Evaluation GET] Fetching job with ID:', id);
            
            const job = await prisma.job.findUnique({
                where: { id },
                include: { resident: true }
            });

            if (job) {
                console.log('[Evaluation GET] Job found, processing result data');
                res.status(200).json(job);
            } else {
                console.log('[Evaluation GET] Job not found');
                res.status(404).json({ message: 'Evaluation not found.' });
            }
        } catch (error) {
            console.error('[Evaluation GET] Error fetching evaluation:', error);
            res.status(500).json({ message: 'An error occurred while fetching the evaluation.' });
        }
        return;
    }

    // --- PUT Request Handler ---
    // This handles finalization and other updates to the evaluation data
    if (req.method === 'PUT') {
        try {
            console.log('[Evaluation PUT] Request body:', JSON.stringify(req.body, null, 2));
            
            // Check if this is an updatedEvaluation request (from finalization)
            const { updatedEvaluation, scores, comments, overallScore, overallComments, status } = req.body;
            
            if (updatedEvaluation) {
                // This is a finalization request - update the job's result field
                console.log('[Evaluation PUT] Processing finalization request');
                
                const updatedJob = await prisma.job.update({
                    where: { id },
                    data: {
                        result: updatedEvaluation,
                        status: updatedEvaluation.isFinalized ? 'complete' : 'draft'
                    },
                });
                
                console.log('[Evaluation PUT] Job updated successfully');
                res.status(200).json(updatedJob);
            } else {
                // This is a legacy live session update - handle individual fields
                console.log('[Evaluation PUT] Processing legacy field update');
                
                // Build an object with only the fields that were actually sent.
                const dataToUpdate: any = {};
                if (scores) dataToUpdate.scores = scores;
                if (comments) dataToUpdate.comments = comments;
                if (overallScore !== undefined) dataToUpdate.overallScore = overallScore;
                if (overallComments) dataToUpdate.overallComments = overallComments;
                if (status) dataToUpdate.status = status;

                // Make sure there's something to update
                if (Object.keys(dataToUpdate).length === 0) {
                    return res.status(400).json({ message: 'No update data provided.' });
                }

                // For legacy updates, we need to update the job's result field
                const currentJob = await prisma.job.findUnique({ where: { id } });
                if (!currentJob) {
                    return res.status(404).json({ message: 'Evaluation not found.' });
                }
                
                let currentResult = {};
                if (currentJob.result) {
                    if (typeof currentJob.result === 'string') {
                        try {
                            currentResult = JSON.parse(currentJob.result);
                        } catch (e) {
                            console.error('Failed to parse current result:', e);
                        }
                    } else {
                        currentResult = currentJob.result as any;
                    }
                }
                
                const updatedResult = { ...currentResult, ...dataToUpdate };
                
                const updatedJob = await prisma.job.update({
                    where: { id },
                    data: {
                        result: updatedResult,
                        status: dataToUpdate.status || currentJob.status
                    },
                });

                res.status(200).json(updatedJob);
            }
        } catch (error) {
            console.error('[Evaluation PUT] Failed to update evaluation:', error);
            res.status(500).json({ message: 'An error occurred while updating the evaluation.' });
        }
        return;
    }

    // --- DELETE Request Handler ---
    if (req.method === 'DELETE') {
        try {
            console.log('[Evaluation DELETE] Deleting job with ID:', id);
            
            const deleteResult = await prisma.job.delete({
                where: { id },
            });
            
            console.log('[Evaluation DELETE] Successfully deleted job:', deleteResult.id);
            res.status(204).end();
        } catch (error) {
            console.error('[Evaluation DELETE] Failed to delete evaluation:', error);
            console.error('[Evaluation DELETE] Error details:', {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            res.status(500).json({ message: 'Failed to delete evaluation.' });
        }
        return;
    }

    // Handle any other methods
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}