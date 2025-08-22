import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

let r2Client: S3Client | null = null;

function initializeR2() {
    if (r2Client) {
        return;
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error("Cloudflare R2 environment variables (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME) are not set.");
    }

    r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

/**
 * Uploads a local file to Cloudflare R2.
 * @param localPath The path to the local file to upload.
 * @param destination The destination path in the R2 bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFileToGCS(localPath: string, destination: string): Promise<string> {
    initializeR2();
    if (!r2Client) {
        throw new Error('R2 Client is not initialized. Check your environment variables.');
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

    try {
        const fileBuffer = fs.readFileSync(localPath);
        const contentType = getContentType(localPath);

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: destination,
            Body: fileBuffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000',
        });

        await r2Client.send(command);
    
        console.log(`${localPath} uploaded to ${bucketName}/${destination}.`);
    
        return getPublicUrl(destination);

    } catch (error) {
        console.error('ERROR uploading file to R2:', error);
        throw error;
    }
}

/**
 * This function returns the public URL for a file in R2.
 */
export function getPublicUrl(destination: string): string {
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const customDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
    
    if (!bucketName) {
        throw new Error("CLOUDFLARE_R2_BUCKET_NAME environment variable not set.");
    }
    
    // Use custom domain if available, otherwise use the default R2 public URL
    if (customDomain) {
        return `https://${customDomain}/${destination}`;
    }
    
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${destination}`;
}

function getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.webm': 'audio/webm',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.json': 'application/json',
    };
    
    return contentTypes[ext] || 'application/octet-stream';
}