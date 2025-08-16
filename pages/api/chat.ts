import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
// FIX: This is the definitive, correct import statement for your Prisma setup.
import prisma from '../../lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ContextSummary {
  residents: { id: string; name: string }[];
  attendings: { id: string; name: string }[];
  cases: { id: string; surgeryName: string }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { history, message, context: contextSummary }: { history: any[], message: string, context: ContextSummary } = req.body;

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const systemPrompt = `You are an expert surgical analyst, Veritas. Your job is to help the user with their requests based on the provided performance data. Be professional, data-driven, and concise.`;
  
  let richContextText = '';
  
  try {
    const richContextData: any = {};

    if (contextSummary.residents && contextSummary.residents.length > 0) {
      const residentsData = await Promise.all(
        contextSummary.residents.map(r => 
          prisma.resident.findUnique({
            where: { id: r.id },
            include: { evaluations: { orderBy: { date: 'desc' }, include: { attending: true } } },
          })
        )
      );
      richContextData.residents = residentsData.filter(Boolean);
    }
    
    if (contextSummary.attendings && contextSummary.attendings.length > 0) {
       const attendingsData = await Promise.all(
        contextSummary.attendings.map(a => 
          prisma.attending.findUnique({
            where: { id: a.id },
            include: { evaluations: { orderBy: { date: 'desc' }, include: { resident: true } } },
          })
        )
      );
      richContextData.attendings = attendingsData.filter(Boolean);
    }

    if (contextSummary.cases && contextSummary.cases.length > 0) {
      const casesData = await Promise.all(
        contextSummary.cases.map(c => 
          prisma.evaluation.findUnique({
            where: { id: c.id },
            include: { resident: true, attending: true },
          })
        )
      );
      richContextData.cases = casesData.filter(Boolean);
    }

    if (Object.keys(richContextData).length > 0) {
        richContextText = `\n\n### CONTEXTUAL DATA ###\n${JSON.stringify(richContextData, null, 2)}`;
    }

    const fullPrompt = `${systemPrompt}\n\n${history.map((h: any) => `${h.sender}: ${h.text}`).join('\n')}\nuser: ${message}${richContextText}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    res.status(200).json({ response: text });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Internal Server Error while processing request.' });
  }
}