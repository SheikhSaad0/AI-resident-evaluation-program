-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "activeDatabase" TEXT NOT NULL DEFAULT 'testing',
    "defaultDatabase" TEXT NOT NULL DEFAULT 'testing',
    "testingDbName" TEXT NOT NULL DEFAULT 'Testing Database',
    "productionDbName" TEXT NOT NULL DEFAULT 'Production Database',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
