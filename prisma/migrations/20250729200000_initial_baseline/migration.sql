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
    "company" TEXT,
    "year" TEXT,
    "medicalSchool" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attending" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "primaryInstitution" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "residency" TEXT,
    "medicalSchool" TEXT,
    "fellowship" TEXT,
    "photoUrl" TEXT,

    CONSTRAINT "Attending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramDirector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "primaryInstitution" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "photoUrl" TEXT,

    CONSTRAINT "ProgramDirector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "activeDatabase" TEXT NOT NULL DEFAULT 'testing',
    "defaultDatabase" TEXT NOT NULL DEFAULT 'testing',
    "testingDbName" TEXT NOT NULL DEFAULT 'Testing Database',
    "productionDbName" TEXT NOT NULL DEFAULT 'Production Database',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "procedure" TEXT NOT NULL,
    "overallFeedback" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationStep" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "duration" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,

    CONSTRAINT "EvaluationStep_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationStep" ADD CONSTRAINT "EvaluationStep_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

