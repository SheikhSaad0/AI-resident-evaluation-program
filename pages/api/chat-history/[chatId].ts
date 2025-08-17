import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { chatId } = req.query;
    const prisma: PrismaClient = getPrismaClient(req);

    if (!chatId || typeof chatId !== 'string') {
        return res.status(400).json({ message: 'Chat ID is required' });
    }

    if (req.method === 'GET') {
        try {
            const chat = await prisma.chatHistory.findUnique({
                where: { id: chatId },
            });
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            res.status(200).json(chat);
        } catch (error) {
            console.error('Failed to fetch chat:', error);
            res.status(500).json({ message: 'Failed to fetch chat' });
        }
    } else if (req.method === 'PUT') {
        const { history } = req.body;
        
        if (!history) {
            return res.status(400).json({ message: 'Chat history is required' });
        }

        try {
            // Logic to dynamically generate a title based on the first user message
            let newTitle = 'New Chat';
            const firstMessage = history.find((msg: any) => msg.sender === 'user');
            if (firstMessage && firstMessage.text) {
                newTitle = firstMessage.text.length > 50 ? firstMessage.text.substring(0, 50) + '...' : firstMessage.text;
            }

            const updatedChat = await prisma.chatHistory.update({
                where: { id: chatId },
                data: {
                    history: history,
                    title: newTitle,
                },
            });
            res.status(200).json(updatedChat);
        } catch (error) {
            console.error('Failed to update chat:', error);
            res.status(500).json({ message: 'Failed to update chat' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}