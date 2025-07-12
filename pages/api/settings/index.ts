// pages/api/settings/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { prismaProduction } from '../../../lib/prisma'; // Directly use the production client

// A function to get or create the settings record from the production DB
async function getSettings() {
  let settings = await prismaProduction.settings.findFirst();

  // If no settings exist in the DB, create a default entry
  if (!settings) {
    console.log("No settings found, creating default settings entry in production DB.");
    settings = await prismaProduction.settings.create({
      data: {
        activeDatabase: 'testing',
        defaultDatabase: 'testing',
        testingDbName: 'Testing Database',
        productionDbName: 'Production Database',
      },
    });
  }
  return settings;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const settings = await getSettings();
      // Reshape the data to match the frontend's expected structure
      const formattedSettings = {
        activeDatabase: settings.activeDatabase,
        defaultDatabase: settings.defaultDatabase,
        databases: {
          testing: { name: settings.testingDbName },
          production: { name: settings.productionDbName },
        },
      };
      res.status(200).json(formattedSettings);
    } catch (error) {
      console.error('Failed to read settings from DB:', error);
      res.status(500).json({ message: 'Failed to read settings' });
    }
  } else if (req.method === 'POST') {
    try {
      const newSettings = req.body;
      const settingsId = (await getSettings()).id; // Get the ID of the single settings entry

      await prismaProduction.settings.update({
        where: { id: settingsId },
        data: {
          activeDatabase: newSettings.activeDatabase,
          defaultDatabase: newSettings.defaultDatabase,
          testingDbName: newSettings.databases.testing.name,
          productionDbName: newSettings.databases.production.name,
        },
      });

      res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Failed to update settings in DB:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}