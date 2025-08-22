import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs';

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
 * Downloads a file from R2 and returns its contents as a Buffer.
 * @param fileName The path to the file in the bucket.
 * @returns A promise that resolves to a Buffer containing the file's data.
 */
export async function downloadFileAsBuffer(fileName: string): Promise<Buffer> {
    initializeR2();
    if (!r2Client) {
        throw new Error('R2 Client is not initialized.');
    }
    
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
    
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileName,
        });
        
        const response = await r2Client.send(command);
        const chunks: Uint8Array[] = [];
        
        if (response.Body) {
            // @ts-ignore - Handle stream properly
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
        }
        
        return Buffer.concat(chunks);
    } catch (error) {
        console.error(`Failed to download file ${fileName}:`, error);
        throw error;
    }
}

export async function generateV4ReadSignedUrl(fileName: string): Promise<string> {
    initializeR2();
    if (!r2Client) {
        throw new Error('R2 Client is not initialized.');
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileName,
        });

        const url = await getSignedUrl(r2Client, command, { 
            expiresIn: 15 * 60 // 15 minutes
        });
        
        return url;
    } catch (error) {
        console.error('ERROR generating read signed R2 URL:', error);
        throw error;
    }
}

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

export async function generateV4UploadSignedUrl(destination: string, contentType: string): Promise<string> {
    initializeR2();
    if (!r2Client) {
        throw new Error('R2 Client is not initialized. Check your environment variables.');
    }

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: destination,
            ContentType: contentType,
        });

        const url = await getSignedUrl(r2Client, command, { 
            expiresIn: 15 * 60 // 15 minutes
        });
        
        return url;
    } catch (error) {
        console.error('ERROR generating signed R2 URL:', error);
        throw error;
    }
}

export async function getFileMetadata(fileName: string) {
    initializeR2();
    if (!r2Client) {
        throw new Error('R2 Client is not initialized.');
    }
    
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
    
    const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileName,
    });
    
    return r2Client.send(command);
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