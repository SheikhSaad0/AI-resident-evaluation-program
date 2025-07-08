-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gcsUrl" TEXT NOT NULL,
    "gcsObjectPath" TEXT,
    "surgeryName" TEXT NOT NULL,
    "additionalContext" TEXT,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withVideo" BOOLEAN NOT NULL DEFAULT false,
    "videoAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "residentId" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
