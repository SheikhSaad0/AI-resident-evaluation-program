import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';
import { PrismaClient } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const prisma: PrismaClient = getPrismaClient(req);

    if (req.method === 'GET') {
        const { userId, userType } = req.query;

        if (!userId || !userType) {
            return res.status(400).json({ message: 'User ID and type are required' });
        }

        try {
            const chats = await prisma.chatHistory.findMany({
                where: { userId: userId as string, userType: userType as string },
                orderBy: { updatedAt: 'desc' },
                select: { id: true, title: true, createdAt: true, updatedAt: true },
            });
            res.status(200).json(chats);
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
            res.status(500).json({ message: 'Failed to fetch chat history' });
        }
    } else if (req.method === 'POST') {
        const { userId, userType, title } = req.body;
        
        if (!userId || !userType) {
            return res.status(400).json({ message: 'User ID and type are required' });
        }

        try {
            const newChat = await prisma.chatHistory.create({
                data: {
                    userId,
                    userType,
                    title: title || 'New Chat',
                    history: [] // Start with an empty history
                },
            });
            res.status(201).json(newChat);
        } catch (error) {
            console.error('Failed to create new chat:', error);
            res.status(500).json({ message: 'Failed to create new chat' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}