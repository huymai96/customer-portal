#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { prisma } from '@/lib/prisma';
import { searchCanonicalStyles } from '@/services/search-service';
import { getCanonicalProductDetail } from '@/services/product-service';

async function main() {
  console.log('Checking PC43 media data...\n');

  // Find PC43
  const results = await searchCanonicalStyles('PC43', { limit: 1 });
  if (results.items.length === 0) {
    console.log('❌ PC43 not found');
    await prisma.$disconnect();
    return;
  }

  const style = results.items[0];
  console.log(`Found: ${style.styleNumber} (${style.displayName})`);
  const canonicalStyleId = (style as any).id || (style as any).canonicalStyleId;
  console.log(`CanonicalStyleId: ${canonicalStyleId}\n`);

  if (!canonicalStyleId) {
    console.log('❌ No canonical style ID found');
    await prisma.$disconnect();
    return;
  }

  // Get product detail
  const detail = await getCanonicalProductDetail(canonicalStyleId);
  if (!detail) {
    console.log('❌ Could not load product detail');
    await prisma.$disconnect();
    return;
  }

  console.log(`Suppliers: ${detail.suppliers.length}\n`);

  // Check each supplier's media
  for (const supplier of detail.suppliers) {
    console.log(`=== ${supplier.supplier} (${supplier.supplierPartId}) ===`);
    const mediaCount = supplier.product?.media?.length || 0;
    console.log(`Media Count: ${mediaCount}`);

    if (mediaCount > 0 && supplier.product?.media) {
      console.log('\nSample Media URLs:');
      supplier.product.media.slice(0, 5).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.url}`);
        console.log(`     Color: ${m.colorCode || 'none'}`);
        console.log(`     Type: ${m.type || 'unknown'}`);
      });
      if (mediaCount > 5) {
        console.log(`  ... and ${mediaCount - 5} more`);
      }
    } else {
      console.log('  ⚠️  No media available');
    }
    console.log('');
  }

  // Check what ProductHero would receive
  const sanmar = detail.suppliers.find((s) => s.supplier === 'SANMAR');
  if (sanmar) {
    console.log('=== ProductHero Input (SanMar) ===');
    const media = sanmar.product?.media || [];
    console.log(`Media array length: ${media.length}`);
    
    // Filter like ProductHero does
    const validMedia = media.filter(
      (item) => item.url && item.url.trim().length > 0 && !item.url.includes('placeholder')
    );
    console.log(`Valid media (after filtering): ${validMedia.length}`);
    
    if (validMedia.length > 0) {
      console.log('\nValid media URLs:');
      validMedia.slice(0, 3).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.url} (color: ${m.colorCode || 'none'})`);
      });
    } else {
      console.log('  ⚠️  No valid media after filtering - ProductHero will show gradient');
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

