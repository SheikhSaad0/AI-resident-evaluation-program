import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';
import { generateV4ReadSignedUrl } from '../../../lib/gcs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- Retained from your original code ---
  // Ensures only GET requests are processed
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  // ---

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'A valid jobId must be provided.' });
  }

  const prisma = await getPrismaClient();

  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // --- This section is now combined and enhanced ---

    // 1. Initialize variables for the results and URL
    let parsedResult = null;
    let readableUrl = null;

    // 2. Safely parse the result, checking its type first
    if (job.result) {
      if (typeof job.result === 'string') {
        try {
          parsedResult = JSON.parse(job.result);
        } catch (e) {
          // Retain your robust error handling for corrupted JSON
          console.error("Failed to parse job result JSON:", e);
          parsedResult = { error: "Corrupted result data" };
        }
      } else {
        // If it's already an object, just use it
        parsedResult = job.result;
      }
    }

    // 3. Generate the signed URL if the job is complete
    if (job.status === 'complete' && job.gcsObjectPath) {
      readableUrl = await generateV4ReadSignedUrl(job.gcsObjectPath);
    }
    // ---

    // Return a complete response object
    res.status(200).json({
      ...job, // Spreads all original job fields (status, error, etc.)
      result: parsedResult, // Overwrites with the correctly parsed result
      readableUrl: readableUrl, // Adds the new URL if available
    });

  } catch (error) {
    console.error(`Error fetching job status for ${jobId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
}