import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  const settingsFilePath = path.resolve(process.cwd(), 'settings.json');
  let activeDatabase = 'testing'; // Default to testing

  if (fs.existsSync(settingsFilePath)) {
    try {
      const fileContent = fs.readFileSync(settingsFilePath, 'utf-8');
      const settings = JSON.parse(fileContent);
      activeDatabase = settings.activeDatabase || 'testing';
    } catch (error) {
      console.error('Could not read or parse settings.json, defaulting to testing database.', error);
    }
  }

  const databaseUrl = activeDatabase === 'production'
    ? process.env.DATABASE_URL_PRODUCTION
    : process.env.DATABASE_URL_TESTING;

  if (!databaseUrl) {
    console.error(`DATABASE_URL for "${activeDatabase}" is not defined. Please check your environment variables.`);
    // Fallback to the default DATABASE_URL if specific one is not found
    if (!process.env.DATABASE_URL) {
      throw new Error('No DATABASE_URL configured.');
    }
    return new PrismaClient({
      log: ['query'],
    });
  }

  console.log(`Prisma client is connecting to: ${activeDatabase}`);

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ['query'],
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}