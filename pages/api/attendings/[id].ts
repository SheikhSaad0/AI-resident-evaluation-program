// pages/api/attendings/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prisma = getPrismaClient(req);
  const attendingId = req.query.id as string;

  if (req.method === 'GET') {
    try {
      const attending = await prisma.attending.findUnique({
        where: { id: attendingId },
      });
      if (!attending) {
        return res.status(404).json({ message: 'Attending not found' });
      }
      res.status(200).json(attending);
    } catch (error) {
      console.error(`Failed to fetch attending ${attendingId}:`, error);
      res.status(500).json({ message: 'Failed to fetch attending' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updatedAttending = await prisma.attending.update({
        where: { id: attendingId },
        data: req.body,
      });
      res.status(200).json(updatedAttending);
    } catch (error) {
      console.error(`Failed to update attending ${attendingId}:`, error);
      res.status(500).json({ message: 'Failed to update attending' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}