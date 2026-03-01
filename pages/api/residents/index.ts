// pages/api/residents/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prismaTesting, prismaProduction } from '../../../lib/prisma'; // Import the direct client instances
import { PrismaClient } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ FIX: Explicitly select the Prisma client based on the 'db' query parameter.
  let prisma: PrismaClient;
  const dbSource = req.query.db;

  if (dbSource === 'production') {
    console.log("SWITCH (RESIDENTS): Forcing use of Production Database.");
    prisma = prismaProduction;
  } else {
    console.log("SWITCH (RESIDENTS): Forcing use of Testing Database.");
    prisma = prismaTesting;
  }

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
      // ✅ FIX: Ensure req.body is an object. 
      // Next.js sometimes receives the body as a string if the Content-Type header isn't perfect.
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      const resident = await prisma.resident.create({
        data: data,
      });
      res.status(201).json(resident);
    } catch (error) {
      console.error("Failed to create resident:", error);
      // Detailed error response to help debugging
      res.status(500).json({ 
        message: 'Failed to create resident', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}