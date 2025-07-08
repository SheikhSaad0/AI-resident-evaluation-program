import { NextApiRequest, NextApiResponse } from 'next';
import { verifySignature } from "@upstash/qstash/nextjs";
import { prisma } from '../../lib/prisma';
import { processJob } from '../../lib/process-job';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { jobId } = req.body;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'A valid jobId must be provided.' });
    }

    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }
    
    await processJob(job);

    res.status(200).json({ message: `Successfully processed job ${jobId}` });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[QStash Handler] Error processing job:', errorMessage);
    res.status(500).json({ error: 'Failed to process job.' });
  }
}

// Wrap the handler with QStash signature verification
export default verifySignature(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};