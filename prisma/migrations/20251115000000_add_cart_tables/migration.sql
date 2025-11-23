-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Cart" (
    "id" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CartLine" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "canonicalStyleId" TEXT NOT NULL,
    "canonicalStyleNumber" TEXT NOT NULL,
    "displayName" TEXT,
    "brand" TEXT,
    "supplier" "SupplierSource" NOT NULL,
    "supplierPartId" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "colorName" TEXT,
    "sizeQuantities" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cart_status_idx" ON "Cart"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CartLine_cartId_idx" ON "CartLine"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CartLine_cartId_supplierPartId_colorCode_key" ON "CartLine"("cartId", "supplierPartId", "colorCode");

-- AddForeignKey (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CartLine_cartId_fkey'
  ) THEN
    ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

