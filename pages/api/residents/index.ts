import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const residents = await prisma.resident.findMany({
                orderBy: { createdAt: 'desc' },
            });
            res.status(200).json(residents);
        } catch (error) {
            res.status(500).json({ message: 'Failed to fetch residents' });
        }
    } else if (req.method === 'POST') {
        try {
            const { name, photoUrl, company, year, medicalSchool, email } = req.body;
            if (!name) {
                return res.status(400).json({ message: 'Name is required.' });
            }
            const newResident = await prisma.resident.create({
                data: { name, photoUrl, company, year, medicalSchool, email },
            });
            res.status(201).json(newResident);
        } catch (error) {
            res.status(500).json({ message: 'Failed to create resident' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}