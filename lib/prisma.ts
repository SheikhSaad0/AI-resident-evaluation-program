// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { NextApiRequest } from 'next';

// (Keep your prismaTesting and prismaProduction singleton declarations)
declare global {
  var prismaTesting: PrismaClient | undefined;
  var prismaProduction: PrismaClient | undefined;
}

const testingClientSingleton = () => {
  if (!process.env.DATABASE_URL_TESTING) {
    throw new Error('DATABASE_URL_TESTING is not defined in your .env file.');
  }
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TESTING } },
  });
};

const productionClientSingleton = () => {
  if (!process.env.DATABASE_URL_PRODUCTION) {
    throw new Error('DATABASE_URL_PRODUCTION is not defined in your .env file.');
  }
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_PRODUCTION } },
  });
};

export const prismaTesting = globalThis.prismaTesting ?? testingClientSingleton();
export const prismaProduction = globalThis.prismaProduction ?? productionClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaTesting = prismaTesting;
  globalThis.prismaProduction = prismaProduction;
}


// This function now correctly prioritizes the request's query parameter.
export const getPrismaClient = (req: NextApiRequest): PrismaClient => {
  const dbSource = req.query.db;

  if (dbSource === 'production') {
    console.log("SWITCH: Using Production Database (from query)");
    return prismaProduction;
  }
  
  // Default to testing if 'testing' is specified or if no parameter is provided.
  console.log("SWITCH: Using Testing Database (from query or default)");
  return prismaTesting;
};