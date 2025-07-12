// pages/api/residents/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the correct prisma client for this specific request at runtime
  const prisma = await getPrismaClient();

  if (req.method === 'GET') {
    try {
      const residents = await prisma.resident.findMany({
        orderBy: { name: 'asc' },
      });
      res.status(200).json(residents);
    } catch (error) {
      console.error("Failed to fetch residents:", error);
      res.status(500).json({ message: 'Failed to fetch residents' });
    }
  } else if (req.method === 'POST') {
    try {
      const resident = await prisma.resident.create({
        data: req.body,
      });
      res.status(201).json(resident);
    } catch (error) {
      console.error("Failed to create resident:", error);
      res.status(500).json({ message: 'Failed to create resident' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}