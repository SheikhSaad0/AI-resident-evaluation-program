import { NextApiRequest, NextApiResponse } from 'next';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// This is the ID for a standard, clear voice. You can find others in your Eleven Labs account.
const VOICE_ID = 'XrExE9yKIg1WjnnlVkGX'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ message: 'Text is required' });
    }
    if (!ELEVENLABS_API_KEY) {
        return res.status(500).json({ message: 'Eleven Labs API key is not configured.' });
    }

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

    try {
        const response = await fetch(elevenLabsUrl, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Eleven Labs API error:', errorBody);
            return res.status(response.status).json({ message: `Error from Eleven Labs: ${errorBody}` });
        }
        
        // Pipe the audio stream directly to the client
        res.setHeader('Content-Type', 'audio/mpeg');
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error calling Eleven Labs API:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}