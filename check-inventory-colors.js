require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Check unique colors in inventory
  const inventoryColors = await prisma.productInventory.findMany({
    where: { supplierPartId: 'PC54' },
    select: { colorCode: true },
    distinct: ['colorCode'],
  });

  const productColors = await prisma.productColor.findMany({
    where: { product: { supplierPartId: 'PC54' } },
    select: { colorCode: true, swatchUrl: true },
  });

  console.log('\n=== PC54 Color Comparison ===\n');
  console.log(`Colors in inventory: ${inventoryColors.length}`);
  console.log(`Colors in Product table: ${productColors.length}`);

  const inventorySet = new Set(inventoryColors.map((c) => c.colorCode));
  const productSet = new Set(productColors.map((c) => c.colorCode));

  // Colors in inventory but not in product
  const missingFromProduct = inventoryColors.filter((c) => !productSet.has(c.colorCode));

  if (missingFromProduct.length > 0) {
    console.log(`\n❌ Colors in inventory but missing from Product: ${missingFromProduct.length}`);
    console.log('\nThese colors have inventory but no swatch will show:');
    missingFromProduct.slice(0, 15).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.colorCode}`);
    });
  } else {
    console.log('\n✅ All inventory colors are in Product table');
  }

  // Check swatch URLs
  const withSwatches = productColors.filter((c) => c.swatchUrl).length;
  console.log(`\n✅ Product colors with swatch URLs: ${withSwatches}/${productColors.length}`);
})()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

