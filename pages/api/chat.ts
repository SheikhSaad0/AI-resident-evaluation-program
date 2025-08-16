import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { history, message, context } = req.body;

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const systemPrompt = `You are an expert surgical analyst, Veritas. Your job is to help the user with their requests. You should be professional and get the job done.
When context is provided, you MUST use it to answer the user's questions. The context may contain information about residents, attendings, and specific cases.
For residents and cases, you will receive detailed evaluation data including scores, times, and comments for each step of the procedure. Use this data to provide summaries, identify areas for improvement, synthesize performance trends, and answer any other questions about the case or resident.
If the provided context does not contain the information needed to answer the user's question, state that the information is not available in the provided context.`;
  
  let contextText = '';
  if (context) {
    contextText = `\n\n### CONTEXT ###\n${JSON.stringify(context, null, 2)}`;
  }

  const fullPrompt = `${systemPrompt}\n\n${history.map((h: any) => `${h.sender}: ${h.text}`).join('\n')}\nuser: ${message}${contextText}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    res.status(200).json({ response: text });
  } catch (error) {
    console.error('Error calling Generative AI API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}