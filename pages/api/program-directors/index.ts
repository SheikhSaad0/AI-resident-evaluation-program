import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Pass the 'req' object to get the correct database client
  const prisma = getPrismaClient(req);

  if (req.method === 'GET') {
    try {
      const programDirectors = await prisma.programDirector.findMany({
        orderBy: { name: 'asc' },
      });
      res.status(200).json(programDirectors);
    } catch (error) {
        console.error("Error fetching program directors:", error);
      res.status(500).json({ message: 'Failed to fetch program directors' });
    }
  } else if (req.method === 'POST') {
    try {
      const programDirector = await prisma.programDirector.create({
        data: req.body,
      });
      res.status(201).json(programDirector);
    } catch (error) {
      console.error("Error creating program director:", error);
      res.status(500).json({ message: 'Failed to create program director' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}