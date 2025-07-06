import { NextApiRequest, NextApiResponse } from 'next';
import { generateV4UploadSignedUrl } from '../../lib/gcs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { fileName, fileType } = req.body;
        if (!fileName || !fileType) {
            return res.status(400).json({ message: 'fileName and fileType are required.' });
        }

        // Sanitize the filename to remove special characters that can cause issues.
        // This replaces anything that is not a letter, number, dot, hyphen, or underscore with an underscore.
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

        const destination = `uploads/${Date.now()}-${sanitizedFileName}`;
        
        const signedUrl = await generateV4UploadSignedUrl(destination, fileType);
        
        res.status(200).json({ signedUrl, destination });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        res.status(500).json({ message: `Failed to generate upload URL: ${errorMessage}` });
    }
}