// lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// Declare global variables to hold the clients for hot-reloading in development
declare global {
  var prismaTesting: PrismaClient | undefined;
  var prismaProduction: PrismaClient | undefined;
}

// Function to create and return the testing client singleton
const testingClientSingleton = () => {
  if (!process.env.DATABASE_URL_TESTING) {
    throw new Error('DATABASE_URL_TESTING is not defined in your .env file.');
  }
  console.log('Initializing Prisma client for Testing DB');
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_TESTING } },
  });
};

// Function to create and return the production client singleton
const productionClientSingleton = () => {
  if (!process.env.DATABASE_URL_PRODUCTION) {
    throw new Error('DATABASE_URL_PRODUCTION is not defined in your .env file.');
  }
  console.log('Initializing Prisma client for Production DB');
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_PRODUCTION } },
  });
};

// Export singleton instances of each client
// In development, this prevents creating new connections on every hot reload
export const prismaTesting = globalThis.prismaTesting ?? testingClientSingleton();
export const prismaProduction =
  globalThis.prismaProduction ?? productionClientSingleton();

// Make sure to re-assign the global variables in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaTesting = prismaTesting;
  globalThis.prismaProduction = prismaProduction;
}

// This is our dynamic "router" function.
// It fetches the current setting and returns the correct prisma client.
export const getPrismaClient = async (): Promise<PrismaClient> => {
  try {
    // The settings table should only exist in the production database as the single source of truth.
    const settings = await prismaProduction.settings.findFirst();

    // If settings are found and the active DB is 'production', return the production client.
    if (settings?.activeDatabase === 'production') {
      console.log("SWITCH: Using Production Database");
      return prismaProduction;
    }
  } catch (error) {
    console.error("Could not fetch settings from production DB, defaulting to testing.", error);
    // If there's any error fetching settings, fall back to testing for safety.
    return prismaTesting;
  }
  
  // By default, or if the active DB is 'testing', return the testing client.
  console.log("SWITCH: Using Testing Database");
  return prismaTesting;
};