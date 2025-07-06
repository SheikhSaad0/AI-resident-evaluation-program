import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import path from 'path';

// Initialize Prisma and GCS
const prisma = new PrismaClient();

const serviceAccountB64 = process.env.GCP_SERVICE_ACCOUNT_B64;
if (!serviceAccountB64) {
  throw new Error('GCP_SERVICE_ACCOUNT_B64 environment variable is not set.');
}
const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
const credentials = JSON.parse(serviceAccountJson);

const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
});

const bucketName = process.env.GCS_BUCKET_NAME || '';
if (!bucketName) {
  throw new Error("GCS_BUCKET_NAME environment variable not set.");
}
const bucket = storage.bucket(bucketName);

// A map of common file extensions to their MIME types
const MIME_TYPES: { [key: string]: string } = {
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/mp4', // <-- THIS IS THE FIX: Serve .mov files as video/mp4
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ error: 'A valid jobId must be provided.' });
  }

  try {
      const job = await prisma.job.findUnique({
          where: { id: jobId },
      });

      if (!job || !job.gcsObjectPath) {
          return res.status(404).json({ error: 'Job or media file not found.' });
      }
      
      const file = bucket.file(job.gcsObjectPath);
      const [metadata] = await file.getMetadata();
      const fileName = metadata.name?.split('/').pop() || 'media';

      // Get the stored content type and the file extension
      let contentType = metadata.contentType;
      const fileExtension = path.extname(job.gcsObjectPath).toLowerCase();

      // If the stored content type is generic or missing, use the file extension to find the correct MIME type.
      if (!contentType || contentType === 'application/octet-stream') {
          contentType = MIME_TYPES[fileExtension] || 'application/octet-stream';
      }
      
      // Also override if the extension is .mov, to ensure it's served as video/mp4
      if (fileExtension === '.mov') {
          contentType = 'video/mp4';
      }

      // Set headers for inline playback and stream the file
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

      const readStream = file.createReadStream();
      
      readStream.on('error', (err) => {
          console.error('Error streaming file from GCS:', err);
          if (!res.headersSent) {
              res.status(500).send('Error streaming file.');
          }
      });

      readStream.pipe(res);

  } catch (error: any) {
      console.error(`Error fetching media for job ${jobId}:`, error);
      if (error.code === 404) {
          return res.status(404).send('File not found in cloud storage.');
      }
      res.status(500).send('Internal Server Error.');
  }
}