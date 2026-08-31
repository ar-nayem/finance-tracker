-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN "feeAmount" REAL NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TransferFeeRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "feeValue" REAL NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferFeeRule_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransferFeeRule_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransferFeeRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferFeeRule_fromAccountId_toAccountId_key" ON "TransferFeeRule"("fromAccountId", "toAccountId");
