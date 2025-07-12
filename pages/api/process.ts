// pages/api/process.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../lib/prisma'; // Use the async getter
import { processJob } from '../../lib/process-job';
import { Job, Resident } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // Authorize the request (e.g., check for a secret header)
  // This is crucial for a webhook that triggers a long-running process
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Get the prisma client
  const prisma = await getPrismaClient();

  try {
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required.' });
    }

    // Find the job that needs to be processed
    const jobToProcess = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        resident: true, // Include resident details
      },
    });

    if (!jobToProcess) {
      return res.status(404).json({ message: `Job with ID ${jobId} not found.` });
    }
    
    // Don't await this, let it run in the background
    processJob(jobToProcess as Job & { resident: Resident | null });

    // Immediately respond to the request
    res.status(202).json({
      message: `Accepted job ${jobId} for processing.`,
    });

  } catch (error) {
    console.error('Error in /api/process endpoint:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}