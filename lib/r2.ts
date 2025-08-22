import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

let s3Client: S3Client | null = null;

function initializeR2() {
    if (s3Client) {
        return;
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error("R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not set.");
    }

    s3Client = new S3Client({
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
    if (!s3Client) {
        throw new Error('R2 Client is not initialized.');
    }

    const bucketName = process.env.R2_BUCKET_NAME!;
    
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileName,
        });
        const response = await s3Client.send(command);
        
        if (!response.Body) {
            throw new Error('No file content received');
        }
        
        const chunks: Buffer[] = [];
        const stream = response.Body as any;
        
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    } catch (error) {
        console.error(`Failed to download file ${fileName}:`, error);
        throw error;
    }
}

export async function generateV4ReadSignedUrl(fileName: string): Promise<string> {
    initializeR2();
    if (!s3Client) {
        throw new Error('R2 Client is not initialized.');
    }

    const bucketName = process.env.R2_BUCKET_NAME!;

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileName,
        });
        
        const url = await getSignedUrl(s3Client, command, { 
            expiresIn: 15 * 60 // 15 minutes
        });
        return url;
    } catch (error) {
        console.error('ERROR generating read signed R2 URL:', error);
        throw error;
    }
}

export async function uploadFileToR2(localPath: string, destination: string): Promise<string> {
    initializeR2();
    if (!s3Client) {
        throw new Error('R2 Client is not initialized. Check your environment variables.');
    }

    const bucketName = process.env.R2_BUCKET_NAME!;

    try {
        const fileContent = fs.readFileSync(localPath);
        
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: destination,
            Body: fileContent,
            ContentType: getContentType(localPath),
        });

        await s3Client.send(command);
        
        console.log(`${localPath} uploaded to ${bucketName}/${destination}.`);
        
        return getPublicUrl(destination);
    } catch (error) {
        console.error('ERROR uploading file to R2:', error);
        throw error;
    }
}

export function getPublicUrl(destination: string): string {
    const bucketName = process.env.R2_BUCKET_NAME;
    const customDomain = process.env.R2_CUSTOM_DOMAIN;
    
    if (!bucketName) {
        throw new Error("R2_BUCKET_NAME environment variable not set.");
    }
    
    // Use custom domain if provided, otherwise use default R2 public URL
    if (customDomain) {
        return `https://${customDomain}/${destination}`;
    }
    
    const accountId = process.env.R2_ACCOUNT_ID;
    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${destination}`;
}

export async function generateV4UploadSignedUrl(destination: string, contentType: string): Promise<string> {
    initializeR2();
    if (!s3Client) {
        throw new Error('R2 Client is not initialized. Check your environment variables.');
    }

    const bucketName = process.env.R2_BUCKET_NAME!;

    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: destination,
            ContentType: contentType,
        });
        
        const url = await getSignedUrl(s3Client, command, { 
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
    if (!s3Client) {
        throw new Error('R2 Client is not initialized.');
    }

    const bucketName = process.env.R2_BUCKET_NAME!;
    
    const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileName,
    });
    
    return s3Client.send(command);
}

function getContentType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
        case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav';
        case 'webm': return 'audio/webm';
        case 'mp4': return 'video/mp4';
        case 'mov': return 'video/quicktime';
        case 'json': return 'application/json';
        case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
}

// Alias functions to maintain compatibility with existing GCS naming
export const uploadFileToGCS = uploadFileToR2;