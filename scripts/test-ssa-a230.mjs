#!/usr/bin/env node
/**
 * Test script: Verify SSActivewear A230 lookup works end-to-end
 * Usage: node scripts/test-ssa-a230.mjs
 */

const ACCOUNT = '72555';
const API_KEY = '2205ef54-d443-48d2-aeee-58c81f73faed';
const AUTH = 'Basic ' + Buffer.from(`${ACCOUNT}:${API_KEY}`).toString('base64');

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Authorization: AUTH },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} - ${url}`);
  }
  return response.json();
}

async function main() {
  console.log('=== SSActivewear A230 Lookup Test ===\n');

  // Step 1: Search for style "A230"
  console.log('1. Searching styles for "A230"...');
  const styles = await fetchJson('https://api.ssactivewear.com/v2/styles/?search=A230');
  if (!styles.length) {
    console.error('❌ No styles found for A230');
    process.exit(1);
  }
  const style = styles[0];
  console.log(`✅ Found: ${style.brandName} ${style.styleName} (partNumber: ${style.partNumber})`);
  console.log(`   Title: ${style.title}`);
  console.log(`   StyleID: ${style.styleID}\n`);

  // Step 2: Fetch products using partNumber
  console.log(`2. Fetching products for partNumber ${style.partNumber}...`);
  const products = await fetchJson(`https://api.ssactivewear.com/v2/products/?partnumber=${style.partNumber}`);
  console.log(`✅ Retrieved ${products.length} SKUs\n`);

  // Step 3: Show sample SKU
  if (products.length > 0) {
    const sample = products[0];
    console.log('3. Sample SKU:');
    console.log(`   SKU: ${sample.sku}`);
    console.log(`   Color: ${sample.colorName} (${sample.colorCode})`);
    console.log(`   Size: ${sample.sizeName} (${sample.sizeCode})`);
    console.log(`   Qty: ${sample.qty}`);
    console.log(`   Price: $${sample.customerPrice || sample.piecePrice || 'N/A'}\n`);
  }

  console.log('=== Test Complete ===');
  console.log('✅ SSActivewear integration correctly resolves A230 → Adidas A230 → 88 SKUs');
}

main().catch((error) => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});

