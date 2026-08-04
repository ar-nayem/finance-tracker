-- CreateTable
CREATE TABLE "AppCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
