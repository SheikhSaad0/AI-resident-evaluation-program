import { PrismaClient } from '@prisma/client';
// Corrected import statement
import pkg from '@vorlefan/prisma-backup';
const { runBackup } = pkg;

const prisma = new PrismaClient();

void (async function () {
  try {
    console.log('Fetching data from the database...');
    const jobs = await prisma.job.findMany({});
    const residents = await prisma.resident.findMany({});
    console.log(`Found ${jobs.length} jobs and ${residents.length} residents to back up.`);

    console.log('Running backup...');
    await runBackup({
      models: {
        Job: jobs,
        Resident: residents,
      },
    });

    console.log('Backup completed successfully!');
  } catch (error) {
    console.error('An error occurred during the backup process:', error);
  } finally {
    await prisma.$disconnect();
  }
})();