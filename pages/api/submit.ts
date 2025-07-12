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
 * For local development, it uses the QSTASH_FORWARDING_URL from your .env.local file (e.g., your ngrok tunnel).
 * As a final fallback, it defaults to localhost.
 */
function getApiBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.QSTASH_FORWARDING_URL) {
    return process.env.QSTASH_FORWARDING_URL;
  }
  // This fallback is for environments where neither is set, though it will fail with QStash.
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

    // 1. Create the job entry in the database
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

    // 2. Trigger the background processing task via QStash
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

    // 3. Respond to the client immediately
    res.status(201).json({ jobId: job.id });

  } catch (error) {
    console.error('Error submitting job:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: 'Failed to submit job for analysis.', error: errorMessage });
  }
}