-- CreateTable
CREATE TABLE "ProductInventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "supplierPartId" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "totalQty" INTEGER NOT NULL,
    "warehouses" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductInventory_supplierPartId_idx" ON "ProductInventory"("supplierPartId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_supplierPartId_colorCode_sizeCode_key" ON "ProductInventory"("supplierPartId", "colorCode", "sizeCode");

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
