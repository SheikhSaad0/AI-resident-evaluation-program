// pages/api/submit.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // Get the correct prisma client at runtime
  const prisma = await getPrismaClient();

  try {
    const {
      gcsUrl,
      gcsObjectPath,
      surgeryName,
      residentId,
      additionalContext,
      withVideo,
      videoAnalysis,
    } = req.body;

    if (!gcsUrl || !surgeryName || !residentId) {
      return res.status(400).json({ message: 'Missing required fields for submission.' });
    }

    const job = await prisma.job.create({
      data: {
        status: 'pending',
        gcsUrl,
        gcsObjectPath,
        surgeryName,
        residentId,
        additionalContext,
        withVideo,
        videoAnalysis,
      },
    });

    res.status(201).json({ jobId: job.id });

  } catch (error) {
    console.error('Error submitting job:', error);
    res.status(500).json({ message: 'Failed to submit job for analysis.' });
  }
}