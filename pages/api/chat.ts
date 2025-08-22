import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { getPrismaClient } from '../../lib/prisma';
import { PrismaClient } from '@prisma/client';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { history, message, context } = req.body;
  const { chatId } = req.query; 
  const prisma: PrismaClient = getPrismaClient(req);

  const systemPrompt = `You are an expert surgical analyst, Veritas. Your job is to help the user with their requests. You should be professional and get the job done.
When context is provided, you MUST use it to answer the user's questions. The context may contain information about residents, attendings, and specific cases.
FOR YOUR RESPONSE, YOU MUST ONLY USE THE DATA PROVIDED IN THE CONTEXT. DO NOT INVENT OR HALLUCINATE ANY DETAILS, NAMES, DATES, OR CASE EXAMPLES. If the data is not present in the context, state that you cannot find the information.
For residents and cases, you will receive detailed evaluation data including scores, times, and comments for each step of the procedure. Use this data to provide summaries, identify areas for improvement, synthesize performance trends, and answer any other questions about the case or resident.

The RISE scale is a 1-5 scoring rubric used for evaluating surgical performance. Here's a breakdown of the scores:
- **1: Unsafe, attending took over.**
- **2: Performed <50% of step, significant help needed.**
- **3: Performed >50% but still needed assistance.**
- **4: Completed with coaching and guidance.**
- **5: Completed independently and proficiently.**

Case difficulty: (Number 1-3) Rate the case difficulty is based on the a procedure-specific scale, typically a 1 is a simple and easy case, a 2 is mid level, some adhesions, etc. and a 3 is a very hard case, prior surgeries, scarring, etc.

If the provided context does not contain the information needed to answer the user's question, state that the information is not available.`;

  let newContext = { ...context };

  const allAttendings = await prisma.attending.findMany();
  const allResidents = await prisma.resident.findMany();

  const combinedProfiles = [...allAttendings, ...allResidents];
  let matchedProfile = null;
  const lowerCaseMessage = message.toLowerCase();

  for (const profile of combinedProfiles) {
      const lowerCaseProfileName = profile.name.toLowerCase();
      
      const messageContainsName = lowerCaseMessage.includes(lowerCaseProfileName);
      const nameContainsMessage = lowerCaseProfileName.includes(lowerCaseMessage);
      
      const coreName = lowerCaseMessage.replace(/ jr\.?$/, '').trim();
      const profileContainsCoreName = lowerCaseProfileName.includes(coreName);

      if (messageContainsName || nameContainsMessage || profileContainsCoreName) {
          matchedProfile = profile;
          break;
      }
  }

  if (matchedProfile) {
    if ('title' in matchedProfile) { 
        const evaluations = await prisma.job.findMany({
            where: { OR: [{ attendingId: matchedProfile.id }, { programDirectorId: matchedProfile.id }] },
            include: { resident: true, attending: true, programDirector: true }
        });
        const type = 'residency' in matchedProfile ? 'Attending' : 'Program Director';
        newContext.attendings = [...(newContext.attendings || []), { supervisor: { ...matchedProfile, type }, evaluations }];
    } else { 
        const evaluations = await prisma.job.findMany({
            where: { residentId: matchedProfile.id },
            include: { resident: true, attending: true, programDirector: true }
        });
        newContext.residents = [...(newContext.residents || []), { resident: matchedProfile, evaluations }];
    }
  }

  const hasContext = (newContext.residents && newContext.residents.length > 0) || (newContext.attendings && newContext.attendings.length > 0) || (newContext.cases && newContext.cases.length > 0);
  if (!hasContext && !message) {
      return res.status(200).json({
          response: "I don't have enough data to perform a detailed analysis on that query. For more specific information, please use the plus icon to select additional context to your query.",
          context: { residents: [], attendings: [], cases: [] }
      });
  }
  
  // --- CORRECTED FIX START ---
  // Create a structured history array for the API request without context in the message text
    const formattedHistory = history.map((h: any) => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        parts: [{ text: h.text }]
    }));
  
  // Prepare the parts for the final message, with context as a separate part
  const finalMessageParts = [{ text: message }];
  if (hasContext) {
      finalMessageParts.push({ text: `\n\n### CONTEXT ###\n${JSON.stringify(newContext, null, 2)}` });
  }

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: systemPrompt
        },
        ...formattedHistory.map((h: any) => ({
            role: h.role as "user" | "assistant",
            content: h.parts[0].text
        })),
        {
            role: "user",
            content: hasContext
                ? `${message}\n\n### CONTEXT ###\n${JSON.stringify(newContext, null, 2)}`
                : message
        }
    ];

    const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: messages
    });
    
    const text = completion.choices[0]?.message?.content || "";
    
    res.status(200).json({ response: text, context: newContext });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
  // --- CORRECTED FIX END ---
}