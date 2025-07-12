// pages/api/submit.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../lib/prisma';
import { Client } from '@upstash/qstash';

// Initialize QStash Client
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

/**
 * Determines the base URL for the API endpoint.
 * In production/staging on Vercel, it uses the VERCEL_URL.
 * For local development, it now uses the NEXT_PUBLIC_QSTASH_FORWARDING_URL for reliability.
 */
function getApiBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Use the NEXT_PUBLIC_ prefixed variable for local development
  if (process.env.NEXT_PUBLIC_QSTASH_FORWARDING_URL) {
    return process.env.NEXT_PUBLIC_QSTASH_FORWARDING_URL;
  }
  // Fallback for QStash to show an error, as localhost is not reachable.
  return 'http://localhost:3000';
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

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

    const apiBaseUrl = getApiBaseUrl();
    const destinationUrl = `${apiBaseUrl}/api/process`;
      
    console.log(`[Submission] Queuing job ${job.id} for processing at: ${destinationUrl}`);

    await qstashClient.publishJSON({
      url: destinationUrl,
      body: {
        jobId: job.id,
      },
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    });

    res.status(201).json({ jobId: job.id });

  } catch (error) {
    console.error('Error submitting job:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: 'Failed to submit job for analysis.', error: errorMessage });
  }
}