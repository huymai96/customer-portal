-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "supplierPartId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "defaultColor" TEXT,
    "description" JSONB,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductColor" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "colorName" TEXT,
    "supplierVariantId" TEXT,
    "swatchUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSize" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "display" TEXT,
    "sort" INTEGER,

    CONSTRAINT "ProductSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorCode" TEXT,
    "url" TEXT NOT NULL,
    "position" INTEGER,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSku" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "supplierSku" TEXT NOT NULL,

    CONSTRAINT "ProductSku_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductKeyword" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,

    CONSTRAINT "ProductKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_supplierPartId_key" ON "Product"("supplierPartId");

-- CreateIndex
CREATE INDEX "Product_supplierPartId_idx" ON "Product"("supplierPartId");

-- CreateIndex
CREATE INDEX "ProductColor_colorCode_idx" ON "ProductColor"("colorCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductColor_productId_colorCode_key" ON "ProductColor"("productId", "colorCode");

-- CreateIndex
CREATE INDEX "ProductSize_sizeCode_idx" ON "ProductSize"("sizeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSize_productId_sizeCode_key" ON "ProductSize"("productId", "sizeCode");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_colorCode_idx" ON "ProductMedia"("productId", "colorCode");

-- CreateIndex
CREATE INDEX "ProductSku_supplierSku_idx" ON "ProductSku"("supplierSku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSku_productId_colorCode_sizeCode_key" ON "ProductSku"("productId", "colorCode", "sizeCode");

-- CreateIndex
CREATE INDEX "ProductKeyword_keyword_idx" ON "ProductKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "ProductKeyword_productId_keyword_key" ON "ProductKeyword"("productId", "keyword");

-- AddForeignKey
ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSize" ADD CONSTRAINT "ProductSize_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSku" ADD CONSTRAINT "ProductSku_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductKeyword" ADD CONSTRAINT "ProductKeyword_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
