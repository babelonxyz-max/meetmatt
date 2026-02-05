/*
  Warnings:

  - You are about to drop the column `devinSessionId` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `devinUrl` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `amountUsd` on the `Payment` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Agent" ("createdAt", "features", "id", "name", "purpose", "sessionId", "status", "tier", "updatedAt") SELECT "createdAt", "features", "id", "name", "purpose", "sessionId", "status", "tier", "updatedAt" FROM "Agent";
DROP TABLE "Agent";
ALTER TABLE "new_Agent" RENAME TO "Agent";
CREATE INDEX "Agent_sessionId_idx" ON "Agent"("sessionId");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "confirmedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Payment" ("address", "amount", "confirmedAt", "createdAt", "currency", "expiresAt", "id", "sessionId", "status", "tier", "txHash") SELECT "address", "amount", "confirmedAt", "createdAt", "currency", "expiresAt", "id", "sessionId", "status", "tier", "txHash" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_sessionId_idx" ON "Payment"("sessionId");
CREATE INDEX "Payment_address_idx" ON "Payment"("address");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
