// pages/api/residents/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prismaTesting, prismaProduction } from '../../../lib/prisma'; // Import the direct client instances
import { PrismaClient } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ FIX: Explicitly select the Prisma client based on the 'db' query parameter.
  // This avoids any potential module caching issues with the getPrismaClient helper function.
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