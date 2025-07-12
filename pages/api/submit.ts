// pages/api/submit.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../lib/prisma'; // Import the new router

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // Get the correct prisma client at runtime, right before you use it.
  const prisma = await getPrismaClient();

  try {
    const { residentId, evaluationData } = req.body;

    if (!residentId || !evaluationData) {
      return res.status(400).json({ message: 'Missing residentId or evaluationData' });
    }

    // This 'prisma' variable is now correctly pointing to either the testing or production client.
    const newJob = await prisma.job.create({
      data: {
        residentId,
        status: 'PENDING',
        evaluationData, 
      },
    });

    res.status(201).json(newJob);
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    res.status(500).json({ message: 'Failed to submit evaluation' });
  }
}