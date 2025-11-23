#!/usr/bin/env tsx
/**
 * Debug UI rendering issues
 * Checks actual data flow and component rendering
 */

const PROD_URL = process.argv[2] || 'https://customer-portal-9hs2nnc52-promos-ink.vercel.app';

async function main() {
  console.log(`\n🔍 Debugging UI Rendering: ${PROD_URL}\n`);
  
  // Get PC43 data
  const searchResponse = await fetch(`${PROD_URL}/api/products/search?query=PC43`);
  const searchData = await searchResponse.json();
  const pc43Item = searchData.items?.find((item: any) => 
    item.styleNumber === 'PC43' || item.suppliers?.some((s: any) => s.supplierPartId === 'PC43')
  );
  
  if (!pc43Item?.canonicalStyleId) {
    console.error('❌ PC43 not found');
    process.exit(1);
  }
  
  const canonicalStyleId = pc43Item.canonicalStyleId;
  console.log(`✅ Found PC43: ${canonicalStyleId}\n`);
  
  // Get product detail
  const detailResponse = await fetch(`${PROD_URL}/api/products/${canonicalStyleId}`);
  const detail = await detailResponse.json();
  
  const sanmarSupplier = detail.suppliers?.find((s: any) => s.supplier === 'SANMAR' && s.supplierPartId === 'PC43');
  if (!sanmarSupplier) {
    console.error('❌ SanMar PC43 supplier not found');
    process.exit(1);
  }
  
  console.log('📊 Data Analysis:\n');
  
  // Check supplier enum value
  console.log(`1. Supplier enum value: "${sanmarSupplier.supplier}" (type: ${typeof sanmarSupplier.supplier})`);
  
  // Check colors
  const colors = sanmarSupplier.product?.colors || [];
  console.log(`2. Colors count: ${colors.length}`);
  console.log(`   Sample colors (first 5):`);
  colors.slice(0, 5).forEach((c: any) => {
    console.log(`     - ${c.colorCode}: ${c.colorName || 'N/A'} (swatchUrl: ${c.swatchUrl ? 'yes' : 'no'})`);
  });
  
  // Check sizes
  const sizes = sanmarSupplier.product?.sizes || [];
  console.log(`3. Sizes count: ${sizes.length}`);
  console.log(`   Size codes: ${sizes.map((s: any) => s.sizeCode).join(', ')}`);
  console.log(`   Size codes sorted: ${sizes.map((s: any) => s.sizeCode).sort((a: string, b: string) => {
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
    const aIdx = order.findIndex(o => o.toUpperCase() === a.toUpperCase());
    const bIdx = order.findIndex(o => o.toUpperCase() === b.toUpperCase());
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    if (aIdx >= 0) return -1;
    if (bIdx >= 0) return 1;
    return a.localeCompare(b);
  }).join(', ')}`);
  
  // Check warehouses
  const warehouses = sanmarSupplier.inventory?.warehouses || [];
  console.log(`4. Warehouses count: ${warehouses.length}`);
  console.log(`   Sample warehouses (first 5):`);
  warehouses.slice(0, 5).forEach((wh: any) => {
    console.log(`     - ID: "${wh.warehouseId}", Name: "${wh.warehouseName || 'null'}"`);
  });
  
  // Check media
  const media = sanmarSupplier.product?.media || [];
  console.log(`5. Media count: ${media.length}`);
  console.log(`   Sample media (first 3):`);
  media.slice(0, 3).forEach((m: any) => {
    console.log(`     - ${m.colorCode || 'GLOBAL'}: ${m.url}`);
  });
  
  console.log('\n✅ Data check complete. Review above for any issues.\n');
}

main().catch(console.error);



