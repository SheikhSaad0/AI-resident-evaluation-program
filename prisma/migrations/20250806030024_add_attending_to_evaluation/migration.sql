-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "attendingId" TEXT;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_attendingId_fkey" FOREIGN KEY ("attendingId") REFERENCES "Attending"("id") ON DELETE SET NULL ON UPDATE CASCADE;
