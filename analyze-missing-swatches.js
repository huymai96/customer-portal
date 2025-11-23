require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Check PC54 colors
  const totalColors = await prisma.productColor.count({
    where: { product: { supplierPartId: 'PC54' } },
  });

  const withSwatch = await prisma.productColor.count({
    where: {
      product: { supplierPartId: 'PC54' },
      swatchUrl: { not: null },
    },
  });

  const withoutSwatch = await prisma.productColor.count({
    where: {
      product: { supplierPartId: 'PC54' },
      swatchUrl: null,
    },
  });

  console.log('\n=== PC54 Swatch Analysis ===\n');
  console.log(`Total colors: ${totalColors}`);
  console.log(`With swatch URL: ${withSwatch}`);
  console.log(`Without swatch URL: ${withoutSwatch}`);

  // Show examples of colors missing swatches
  const missingSwatches = await prisma.productColor.findMany({
    where: {
      product: { supplierPartId: 'PC54' },
      swatchUrl: null,
    },
    select: {
      colorCode: true,
      colorName: true,
    },
    take: 10,
  });

  console.log('\nColors missing swatch URLs (first 10):');
  missingSwatches.forEach((c, i) => {
    console.log(`${i + 1}. ${c.colorCode} - ${c.colorName}`);
  });

  // Check if the issue is in the source data
  console.log('\n=== Checking Import Source ===');
  console.log('This could be because:');
  console.log('1. SanMar SDL file does not include swatch URLs for all colors');
  console.log('2. Some colors are new and swatches not yet available');
  console.log('3. Import script is not parsing swatch URLs correctly');
})()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

