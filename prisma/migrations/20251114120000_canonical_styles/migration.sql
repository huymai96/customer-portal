-- CreateEnum
CREATE TYPE "SupplierSource" AS ENUM ('SANMAR', 'SSACTIVEWEAR');

-- CreateTable
CREATE TABLE "CanonicalStyle" (
    "id" TEXT NOT NULL,
    "styleNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "brand" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalStyle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProductLink" (
    "id" TEXT NOT NULL,
    "canonicalStyleId" TEXT NOT NULL,
    "supplier" "SupplierSource" NOT NULL,
    "supplierPartId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalStyle_styleNumber_key" ON "CanonicalStyle"("styleNumber");

-- CreateIndex
CREATE INDEX "SupplierProductLink_canonicalStyleId_idx" ON "SupplierProductLink"("canonicalStyleId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProductLink_supplier_supplierPartId_key" ON "SupplierProductLink"("supplier", "supplierPartId");

-- AddForeignKey
ALTER TABLE "SupplierProductLink" ADD CONSTRAINT "SupplierProductLink_canonicalStyleId_fkey" FOREIGN KEY ("canonicalStyleId") REFERENCES "CanonicalStyle"("id") ON DELETE CASCADE ON UPDATE CASCADE;



