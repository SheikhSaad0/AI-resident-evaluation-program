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
            const evaluation = await prisma.evaluation.findUnique({
                where: { id },
            });

            if (evaluation) {
                res.status(200).json(evaluation);
            } else {
                res.status(404).json({ message: 'Evaluation not found.' });
            }
        } catch (error) {
            console.error('Error fetching evaluation:', error);
            res.status(500).json({ message: 'An error occurred while fetching the evaluation.' });
        }
        return;
    }

    // --- PUT Request Handler ---
    // This is what gets called when you end the live session.
    if (req.method === 'PUT') {
        try {
            // Get the new data from the request body
            const { scores, comments, overallScore, overallComments, status } = req.body;

            // Build an object with only the fields that were actually sent.
            // This is the key to the fix: it prevents overwriting existing data with 'null' or 'undefined'.
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

            const updatedEvaluation = await prisma.evaluation.update({
                where: { id },
                data: dataToUpdate,
            });

            res.status(200).json(updatedEvaluation);
        } catch (error) {
            console.error('Failed to update evaluation:', error);
            res.status(500).json({ message: 'An error occurred while updating the evaluation.' });
        }
        return;
    }

    // --- DELETE Request Handler ---
    if (req.method === 'DELETE') {
        try {
            await prisma.job.delete({
                where: { id },
            });
            res.status(204).end();
        } catch (error) {
            console.error('Failed to delete evaluation:', error);
            res.status(500).json({ message: 'Failed to delete evaluation.' });
        }
        return;
    }

    // Handle any other methods
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}