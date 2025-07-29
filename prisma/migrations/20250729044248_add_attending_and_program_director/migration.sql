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
CREATE TABLE "playing_with_neon" (
    "id" SERIAL NOT NULL,
    "value" TEXT,

    CONSTRAINT "playing_with_neon_pkey" PRIMARY KEY ("id")
);
