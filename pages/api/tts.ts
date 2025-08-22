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
    const response = await openai.audio.speech.create({
      model: 'tts-1', // OpenAI TTS model
      voice: 'nova', // Female voice similar to Siri/Alexa
      input: text,
      response_format: 'mp3',
      speed: 1.4, // Adjust speed to match previous setting
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    if (audioBuffer) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } else {
      throw new Error('No audio content received from OpenAI TTS.');
    }
  } catch (error) {
    console.error('Error calling OpenAI TTS API:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}