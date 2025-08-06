-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "programDirectorId" TEXT;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_programDirectorId_fkey" FOREIGN KEY ("programDirectorId") REFERENCES "ProgramDirector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
