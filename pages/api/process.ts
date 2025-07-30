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
  const prisma = getPrismaClient(req);

  try {
    const { jobId } = req.body;
    console.log(`[Process API] Received request to process job: ${jobId}`);

    if (!jobId) {
      console.error(`[Process API] No jobId provided in request body`);
      return res.status(400).json({ message: 'Job ID is required.' });
    }

    console.log(`[Process API] Looking up job ${jobId} in database...`);
    // Find the job that needs to be processed
    const jobToProcess = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        resident: true, // Include resident details
      },
    });

    if (!jobToProcess) {
      console.error(`[Process API] Job ${jobId} not found in database`);
      return res.status(404).json({ message: `Job with ID ${jobId} not found.` });
    }
    
    console.log(`[Process API] Found job ${jobId}, starting background processing...`);
    console.log(`[Process API] Job details:`, {
      id: jobToProcess.id,
      status: jobToProcess.status,
      gcsUrl: jobToProcess.gcsUrl,
      gcsObjectPath: jobToProcess.gcsObjectPath,
      surgeryName: jobToProcess.surgeryName,
      residentName: jobToProcess.resident?.name
    });
    
    // Don't await this, let it run in the background
    processJob(jobToProcess as Job & { resident: Resident | null }, prisma);

    // Immediately respond to the request
    console.log(`[Process API] Job ${jobId} accepted for processing`);
    res.status(202).json({
      message: `Accepted job ${jobId} for processing.`,
    });

  } catch (error) {
    console.error('Error in /api/process endpoint:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}