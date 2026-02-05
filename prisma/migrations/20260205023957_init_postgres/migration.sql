-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "devin_session_id" TEXT,
    "devin_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tx_hash" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agents_session_id_idx" ON "agents"("session_id");

-- CreateIndex
CREATE INDEX "agents_status_idx" ON "agents"("status");

-- CreateIndex
CREATE INDEX "payments_session_id_idx" ON "payments"("session_id");

-- CreateIndex
CREATE INDEX "payments_address_idx" ON "payments"("address");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");
