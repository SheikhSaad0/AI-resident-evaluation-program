-- prisma/migrations/20250629034326_init/migration.sql

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gcsUrl" TEXT NOT NULL,
    "surgeryName" TEXT NOT NULL,
    "residentName" TEXT,
    "additionalContext" TEXT,
    "result" TEXT,
    "thumbnailUrl" TEXT, -- ADD THIS LINE
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "withVideo" BOOLEAN NOT NULL DEFAULT false,
    "videoAnalysis" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);