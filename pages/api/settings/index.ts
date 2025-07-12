import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const settingsFilePath = path.resolve(process.cwd(), 'settings.json');

const readSettings = () => {
  if (fs.existsSync(settingsFilePath)) {
    const fileContent = fs.readFileSync(settingsFilePath, 'utf-8');
    return JSON.parse(fileContent);
  }
  // Default settings if the file doesn't exist
  return {
    activeDatabase: 'testing',
    defaultDatabase: 'testing',
    databases: {
      testing: { name: 'Testing Database' },
      production: { name: 'Production Database' },
    },
  };
};

const writeSettings = (settings: any) => {
  fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const settings = readSettings();
      res.status(200).json(settings);
    } catch (error) {
      console.error('Failed to read settings:', error);
      res.status(500).json({ message: 'Failed to read settings' });
    }
  } else if (req.method === 'POST') {
    try {
      const newSettings = req.body;
      writeSettings(newSettings);
      res.status(200).json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Failed to update settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}