import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize R2 client
function getR2Client() {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });
}

const bucketName = process.env.R2_BUCKET_NAME || '';
if (!bucketName) {
  throw new Error("R2_BUCKET_NAME environment variable not set.");
}

/**
 * Uploads a local file to Cloudflare R2.
 * @param localPath The path to the local file to upload.
 * @param destination The destination path in the R2 bucket.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFileToR2(localPath: string, destination: string): Promise<string> {
  try {
    const s3Client = getR2Client();
    const fileContent = Buffer.from(require('fs').readFileSync(localPath));
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: destination,
      Body: fileContent,
    });

    await s3Client.send(command);
    
    console.log(`${localPath} uploaded to ${bucketName}/${destination}.`);
    
    // Return the public URL (adjust based on your R2 configuration)
    const customDomain = process.env.R2_CUSTOM_DOMAIN;
    if (customDomain) {
        return `https://${customDomain}/${destination}`;
    }
    return `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${destination}`;
  } catch (error) {
    console.error('ERROR uploading file to R2:', error);
    throw error;
  }
}

/**
 * This function returns the public URL for an R2 object.
 */
export function getPublicUrl(destination: string): string {
  const customDomain = process.env.R2_CUSTOM_DOMAIN;
  if (customDomain) {
      return `https://${customDomain}/${destination}`;
  }
  return `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${destination}`;
}