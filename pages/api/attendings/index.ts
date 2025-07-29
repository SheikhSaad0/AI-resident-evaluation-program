import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Pass the 'req' object to get the correct database client
  const prisma = getPrismaClient(req);

  if (req.method === 'GET') {
    try {
      const attendings = await prisma.attending.findMany({
        orderBy: { name: 'asc' },
      });
      res.status(200).json(attendings);
    } catch (error) {
      console.error("Error fetching attendings:", error);
      res.status(500).json({ message: 'Failed to fetch attendings' });
    }
  } else if (req.method === 'POST') {
    try {
      const attending = await prisma.attending.create({
        data: req.body,
      });
      res.status(201).json(attending);
    } catch (error) {
      console.error("Error creating attending:", error);
      res.status(500).json({ message: 'Failed to create attending' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}