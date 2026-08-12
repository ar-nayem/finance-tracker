-- CreateTable
CREATE TABLE "InvestmentTopUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    CONSTRAINT "InvestmentTopUp_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
