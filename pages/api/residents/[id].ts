// pages/api/residents/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const prisma = await getPrismaClient();
  const residentId = req.query.id as string;

  if (req.method === 'GET') {
    try {
      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
        include: { jobs: true }, // Assuming you want to include related jobs
      });
      if (!resident) {
        return res.status(404).json({ message: 'Resident not found' });
      }
      res.status(200).json(resident);
    } catch (error) {
      console.error(`Failed to fetch resident ${residentId}:`, error);
      res.status(500).json({ message: 'Failed to fetch resident' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { name, email, photoUrl, company, year, medicalSchool } = req.body;
      const updatedResident = await prisma.resident.update({
        where: { id: residentId },
        data: {
          name,
          email,
          photoUrl,
          company,
          year,
          medicalSchool,
        },
      });
      res.status(200).json(updatedResident);
    } catch (error) {
      console.error(`Failed to update resident ${residentId}:`, error);
      res.status(500).json({ message: 'Failed to update resident' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.resident.delete({
        where: { id: residentId },
      });
      res.status(204).end(); // No content
    } catch (error) {
      console.error(`Failed to delete resident ${residentId}:`, error);
      res.status(500).json({ message: 'Failed to delete resident' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}