#!/usr/bin/env node
/**
 * Verify A230 is searchable in the portal database
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('=== Verifying A230 in Database ===\n');

  // Check product table
  console.log('1. Checking Product table...');
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { supplierPartId: { contains: 'A230', mode: 'insensitive' } },
        { name: { contains: 'A230', mode: 'insensitive' } },
      ],
    },
    include: {
      colors: true,
      sizes: true,
    },
  });

  if (product) {
    console.log(`✅ Found product: ${product.brand} ${product.name}`);
    console.log(`   Part ID: ${product.supplierPartId}`);
    console.log(`   Colors: ${product.colors.length}`);
    console.log(`   Sizes: ${product.sizes.length}\n`);
  } else {
    console.log('❌ No product found\n');
  }

  // Check canonical styles
  console.log('2. Checking CanonicalStyle table...');
  const canonicalStyles = await prisma.canonicalStyle.findMany({
    where: {
      OR: [
        { styleNumber: { contains: 'A230', mode: 'insensitive' } },
        { displayName: { contains: 'A230', mode: 'insensitive' } },
        { supplierLinks: { some: { supplierPartId: { contains: 'A230', mode: 'insensitive' } } } },
      ],
    },
    include: {
      supplierLinks: true,
    },
  });

  if (canonicalStyles.length > 0) {
    console.log(`✅ Found ${canonicalStyles.length} canonical style(s):`);
    canonicalStyles.forEach((style) => {
      console.log(`   - ${style.styleNumber} | ${style.displayName} (${style.brand || 'N/A'})`);
      style.supplierLinks.forEach((link) => {
        console.log(`     └─ ${link.supplier}: ${link.supplierPartId}`);
      });
    });
    console.log();
  } else {
    console.log('❌ No canonical styles found\n');
  }

  // Test search service
  console.log('3. Testing search service...');
  try {
    const { searchCanonicalStyles } = await import('../src/services/search-service.ts');
    const searchResults = await searchCanonicalStyles('A230', { limit: 5, offset: 0 });
    console.log(`✅ Search returned ${searchResults.items.length} result(s):`);
    searchResults.items.forEach((result) => {
      console.log(`   - ${result.styleNumber} | ${result.displayName}`);
      console.log(`     Suppliers: ${result.suppliers.map((s) => s.supplier).join(', ')}`);
    });
  } catch (error) {
    console.log(`⚠️  Search service error: ${error.message}`);
  }

  console.log('\n=== Verification Complete ===');
}

main()
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

