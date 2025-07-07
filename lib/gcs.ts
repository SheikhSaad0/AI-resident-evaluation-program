import { Storage, Bucket } from '@google-cloud/storage';

let storage: Storage | null = null;
let bucket: Bucket | null = null;

function initializeGCS() {
    if (storage && bucket) {
        return;
    }
    const serviceAccountB64 = process.env.GCP_SERVICE_ACCOUNT_B64;
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!serviceAccountB64 || !bucketName) {
        throw new Error("GCS environment variables are not set.");
    }
    const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
    const credentials = JSON.parse(serviceAccountJson);
    storage = new Storage({ projectId: credentials.project_id, credentials });
    bucket = storage.bucket(bucketName);
}

export async function generateV4ReadSignedUrl(fileName: string): Promise<string> {
    initializeGCS();
    if (!bucket) throw new Error('GCS Bucket is not initialized.');

    // This forces the browser to display the file inline instead of downloading.
    const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
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

export async function generateV4UploadSignedUrl(destination: string, contentType: string): Promise<string> {
    initializeGCS();
    if (!bucket) throw new Error('GCS Bucket is not initialized.');
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