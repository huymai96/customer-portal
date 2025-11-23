#!/usr/bin/env tsx
/**
 * Detailed PC43 verification
 * Checks that all colors, sizes, and warehouses are present
 */

const PROD_URL = process.argv[2] || 'https://customer-portal-q3i8dv5ip-promos-ink.vercel.app';

async function main() {
  console.log(`\n🔍 Detailed PC43 Verification: ${PROD_URL}\n`);
  
  // Step 1: Search for PC43
  console.log('1. Searching for PC43...');
  const searchResponse = await fetch(`${PROD_URL}/api/products/search?query=PC43`);
  if (!searchResponse.ok) {
    console.error(`❌ Search failed: ${searchResponse.status}`);
    process.exit(1);
  }
  const searchData = await searchResponse.json();
  const pc43Item = searchData.items?.find((item: any) => 
    item.styleNumber === 'PC43' || item.suppliers?.some((s: any) => s.supplierPartId === 'PC43')
  );
  
  if (!pc43Item?.canonicalStyleId) {
    console.error('❌ PC43 not found in search results');
    process.exit(1);
  }
  
  const canonicalStyleId = pc43Item.canonicalStyleId;
  console.log(`✅ Found PC43: ${canonicalStyleId}\n`);
  
  // Step 2: Get product detail
  console.log('2. Fetching product detail...');
  const detailResponse = await fetch(`${PROD_URL}/api/products/${canonicalStyleId}`);
  if (!detailResponse.ok) {
    console.error(`❌ Product detail failed: ${detailResponse.status}`);
    process.exit(1);
  }
  const detail = await detailResponse.json();
  
  const sanmarSupplier = detail.suppliers?.find((s: any) => s.supplier === 'SANMAR' && s.supplierPartId === 'PC43');
  if (!sanmarSupplier) {
    console.error('❌ SanMar PC43 supplier not found');
    process.exit(1);
  }
  
  const colors = sanmarSupplier.product?.colors || [];
  const sizes = sanmarSupplier.product?.sizes || [];
  const warehouses = sanmarSupplier.inventory?.warehouses || [];
  const inventoryRows = sanmarSupplier.inventory?.rows || [];
  
  console.log(`✅ Product detail loaded\n`);
  
  // Step 3: Verify counts
  console.log('3. Verifying data completeness:\n');
  console.log(`   Colors: ${colors.length} (expected: ~51)`);
  console.log(`   Sizes: ${sizes.length} (expected: 9)`);
  console.log(`   Warehouses: ${warehouses.length} (expected: ~14)`);
  console.log(`   Inventory rows: ${inventoryRows.length}\n`);
  
  // Step 4: Check size order
  const sizeCodes = sizes.map((s: any) => s.sizeCode).sort();
  const expectedSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
  console.log('4. Size codes:', sizeCodes.join(', '));
  const missingSizes = expectedSizes.filter(s => !sizeCodes.includes(s));
  if (missingSizes.length > 0) {
    console.log(`   ⚠️  Missing sizes: ${missingSizes.join(', ')}`);
  } else {
    console.log(`   ✅ All expected sizes present\n`);
  }
  
  // Step 5: Check warehouse names
  console.log('5. Warehouse display names:');
  warehouses.slice(0, 10).forEach((wh: any) => {
    console.log(`   - ${wh.warehouseId}: ${wh.warehouseName || 'N/A'}`);
  });
  if (warehouses.length > 10) {
    console.log(`   ... and ${warehouses.length - 10} more\n`);
  } else {
    console.log();
  }
  
  // Step 6: Check color samples
  console.log('6. Sample colors (first 10):');
  colors.slice(0, 10).forEach((c: any) => {
    console.log(`   - ${c.colorCode}: ${c.colorName || 'N/A'}`);
  });
  if (colors.length > 10) {
    console.log(`   ... and ${colors.length - 10} more\n`);
  } else {
    console.log();
  }
  
  // Summary
  const allGood = colors.length >= 50 && sizes.length >= 9 && warehouses.length >= 10;
  if (allGood) {
    console.log('✅ PC43 data looks complete!\n');
  } else {
    console.log('⚠️  Some data may be incomplete. Check counts above.\n');
  }
  
  // Step 7: Test product page loads
  console.log('7. Testing product page...');
  const pageResponse = await fetch(`${PROD_URL}/product/${canonicalStyleId}`, {
    headers: { 'Accept': 'text/html' }
  });
  if (pageResponse.ok) {
    console.log(`✅ Product page loads: ${pageResponse.status}\n`);
  } else {
    console.log(`❌ Product page failed: ${pageResponse.status}\n`);
  }
}

main().catch(console.error);



