-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "hour" INTEGER NOT NULL DEFAULT 8,
    "lastSentYearMonth" TEXT,
    "updatedAt" DATETIME NOT NULL
);
