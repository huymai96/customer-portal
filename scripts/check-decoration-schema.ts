#!/usr/bin/env tsx
/**
 * Check if decoration workflow tables exist in the database
 */

import 'tsconfig-paths/register';
import { prisma } from '@/lib/prisma';

async function main() {
  try {
    console.log('Checking decoration workflow schema...');
    
    // Try to query the Order table
    const orderCount = await prisma.order.count();
    console.log(`✓ Order table exists (${orderCount} records)`);
    
    const orderLineCount = await prisma.orderLine.count();
    console.log(`✓ OrderLine table exists (${orderLineCount} records)`);
    
    const decorationCount = await prisma.orderDecoration.count();
    console.log(`✓ OrderDecoration table exists (${decorationCount} records)`);
    
    const artworkCount = await prisma.artworkAsset.count();
    console.log(`✓ ArtworkAsset table exists (${artworkCount} records)`);
    
    console.log('\n✅ All decoration workflow tables are present!');
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.log('\n⚠️  Migration may not have been applied. Run: npx prisma migrate deploy');
    }
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

