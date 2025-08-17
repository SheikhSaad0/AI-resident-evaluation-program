import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../lib/prisma';
import { Client } from '@upstash/qstash';

// Initialize QStash Client
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN!,
});

function getApiBaseUrl() {
  // Use the new environment variable for the app's public URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.NEXT_PUBLIC_QSTASH_FORWARDING_URL) {
    return process.env.NEXT_PUBLIC_QSTASH_FORWARDING_URL;
  }
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

  const prisma = getPrismaClient(req);

  try {
    const {
      gcsPaths,
      surgeryName,
      residentId,
      additionalContext,
      analysisType,
    } = req.body;

    if (!gcsPaths || gcsPaths.length === 0 || !surgeryName || !residentId) {
      return res.status(400).json({ message: 'Missing required fields for submission.' });
    }

    const job = await prisma.job.create({
      data: {
        status: 'pending',
        gcsUrl: gcsPaths[0].url,
        gcsObjectPath: gcsPaths[0].path,
        surgeryName,
        residentId,
        additionalContext,
        withVideo: gcsPaths.some((p: any) => p.type.startsWith('video/')),
        videoAnalysis: analysisType === 'video',
        result: { gcsPaths } as any,
      },
    });

    const apiBaseUrl = getApiBaseUrl();
    
    // --- FIX START ---
    // Append the database query parameter to the destination URL
    const db = req.query.db || 'testing';
    const destinationUrl = `${apiBaseUrl}/api/process?db=${db}`;
    // --- FIX END ---

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