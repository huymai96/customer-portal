require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🔍 Debugging Swatch URL Issues\n');

  // Get a product with colors (looks like PC54 from image)
  const product = await prisma.product.findUnique({
    where: { supplierPartId: 'PC54' },
    select: {
      supplierPartId: true,
      colors: {
        select: {
          colorCode: true,
          colorName: true,
          swatchUrl: true,
        },
        take: 10,
      },
    },
  });

  console.log('First 10 PC54 colors:\n');
  product.colors.forEach((c, i) => {
    const url = c.swatchUrl 
      ? `https://www.sanmar.com/swatches/color/${c.swatchUrl}`
      : 'NULL (will try to generate)';
    console.log(`${i + 1}. ${c.colorCode} - ${c.colorName}`);
    console.log(`   Swatch URL: ${c.swatchUrl || 'NULL'}`);
    console.log(`   Full URL: ${url}\n`);
  });

  console.log('\n🧪 Test these URLs in browser to see which ones 404:\n');
  product.colors.slice(0, 5).forEach((c) => {
    if (c.swatchUrl) {
      console.log(`https://www.sanmar.com/swatches/color/${c.swatchUrl}`);
    }
  });
})()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

