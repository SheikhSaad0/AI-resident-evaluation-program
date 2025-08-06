import { Storage, Bucket } from '@google-cloud/storage';
import path from 'path';

let storage: Storage | null = null;
let bucket: Bucket | null = null;

function initializeGCS() {
    if (storage && bucket) {
        return;
    }

    const serviceAccountB64 = process.env.GCP_SERVICE_ACCOUNT_B64;
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!serviceAccountB64 || !bucketName) {
        throw new Error("GCS environment variables (GCP_SERVICE_ACCOUNT_B64, GCS_BUCKET_NAME) are not set.");
    }

    const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
    const credentials = JSON.parse(serviceAccountJson);

    storage = new Storage({
        projectId: credentials.project_id,
        credentials,
    });

    bucket = storage.bucket(bucketName);
}

// --- ADD THIS NEW FUNCTION ---
/**
 * Downloads a file from GCS and returns its contents as a Buffer.
 * @param fileName The path to the file in the bucket.
 * @returns A promise that resolves to a Buffer containing the file's data.
 */
export async function downloadFileAsBuffer(fileName: string): Promise<Buffer> {
    initializeGCS();
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized.');
    }
    try {
        const [contents] = await bucket.file(fileName).download();
        return contents;
    } catch (error) {
        console.error(`Failed to download file ${fileName}:`, error);
        throw error;
    }
}
// --- END OF NEW FUNCTION ---


export async function generateV4ReadSignedUrl(fileName: string): Promise<string> {
    initializeGCS();
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized.');
    }

    const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + 15 * 60 * 1000, 
        contentDisposition: 'inline',
    };

    try {
        const [url] = await bucket.file(fileName).getSignedUrl(options as any);
        return url;
    } catch (error) {
        console.error('ERROR generating read signed GCS URL:', error);
        throw error;
    }
}

export async function uploadFileToGCS(localPath: string, destination: string): Promise<string> {
    initializeGCS();
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized. Check your environment variables.');
    }

    try {
        const options = {
            destination: destination,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        };

        await bucket.upload(localPath, options);
    
        console.log(`${localPath} uploaded to ${process.env.GCS_BUCKET_NAME}/${destination}.`);
    
        return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${destination}`;

    } catch (error) {
        console.error('ERROR uploading file to GCS:', error);
        throw error;
    }
}

export function getPublicUrl(destination: string): string {
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
        throw new Error("GCS_BUCKET_NAME environment variable not set.");
    }
    return `https://storage.googleapis.com/${bucketName}/${destination}`;
}

export async function generateV4UploadSignedUrl(destination: string, contentType: string): Promise<string> {
    initializeGCS();
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized. Check your environment variables.');
    }

    const options = {
        version: 'v4' as const,
        action: 'write' as const,
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
    };

    try {
        const [url] = await bucket.file(destination).getSignedUrl(options);
        return url;
    } catch (error) {
        console.error('ERROR generating signed GCS URL:', error);
        throw error;
    }
}

export async function getFileMetadata(fileName: string) {
    initializeGCS();
    if (!bucket) {
        throw new Error('GCS Bucket is not initialized.');
    }
    return bucket.file(fileName).getMetadata();
}