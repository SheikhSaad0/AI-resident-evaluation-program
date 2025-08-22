import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// --- OpenAI TTS Setup ---
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
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
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // Female voice similar to Siri/Alexa
      input: text,
      response_format: "mp3",
      speed: 1.4, // Adjust speed similar to the previous setting
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (error) {
    console.error('Error calling OpenAI TTS API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}