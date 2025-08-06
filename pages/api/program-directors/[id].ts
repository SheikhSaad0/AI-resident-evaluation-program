// pages/api/program-directors/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prisma = getPrismaClient(req);
  const directorId = req.query.id as string;

  if (req.method === 'GET') {
    try {
      const director = await prisma.programDirector.findUnique({
        where: { id: directorId },
      });
      if (!director) {
        return res.status(404).json({ message: 'Program Director not found' });
      }
      res.status(200).json(director);
    } catch (error) {
      console.error(`Failed to fetch program director ${directorId}:`, error);
      res.status(500).json({ message: 'Failed to fetch program director' });
    }
  } else if (req.method === 'PUT') {
    try {
      // Destructure the expected fields from the request body
      const { name, email, title, primaryInstitution, specialty, photoUrl } = req.body;
      const updatedDirector = await prisma.programDirector.update({
        where: { id: directorId },
        data: {
          name,
          email,
          title,
          primaryInstitution,
          specialty,
          photoUrl,
        },
      });
      res.status(200).json(updatedDirector);
    } catch (error) {
      console.error(`Failed to update program director ${directorId}:`, error);
      // Provide a more specific error message if it's a validation error
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ message: `Program director with ID ${directorId} not found.` });
      }
      res.status(500).json({ message: 'Failed to update program director' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}