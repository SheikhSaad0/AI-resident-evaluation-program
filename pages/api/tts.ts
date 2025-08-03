import { NextApiRequest, NextApiResponse } from 'next';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// --- Google Cloud TTS Setup ---
const serviceAccountJson = Buffer.from(
  process.env.GCP_SERVICE_ACCOUNT_B64 || '',
  'base64'
).toString('utf-8');
const credentials = JSON.parse(serviceAccountJson);

const ttsClient = new TextToSpeechClient({
  credentials,
  projectId: credentials.project_id,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {
    const request = {
      input: { text: text },
      // --- Using Neural2 for speed control ---
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-E', // A high-quality, natural-sounding voice
      },
      // --- Full control over speed and pitch ---
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.4, // Adjust this value to get the perfect speed
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const audioContent = response.audioContent;

    if (audioContent) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioContent);
    } else {
      throw new Error('No audio content received from Google Cloud TTS.');
    }
  } catch (error) {
    console.error('Error calling Google Cloud TTS API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}