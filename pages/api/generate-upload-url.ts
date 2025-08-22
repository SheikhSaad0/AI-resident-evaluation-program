// pages/api/generate-upload-url.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { generateV4UploadSignedUrl } from '../../lib/r2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end('Method Not Allowed');
    }

    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
        return res.status(400).json({ error: 'Missing fileName or fileType' });
    }

    try {
        const signedUrl = await generateV4UploadSignedUrl(fileName, fileType);
        res.status(200).json({ uploadUrl: signedUrl, filePath: fileName });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
}