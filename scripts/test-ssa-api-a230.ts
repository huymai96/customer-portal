#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { loadConfig } from '@/integrations/ssactivewear/config';

async function main() {
  console.log('Testing S&S Activewear API for A230...\n');

  const config = loadConfig();
  const auth = `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`;

  try {
    const response = await fetch(`${config.restBaseUrl}/products/?partnumber=A230`, {
      headers: { Authorization: auth },
    });

    if (!response.ok) {
      console.error(`API returned ${response.status}: ${response.statusText}`);
      return;
    }

    const products = await response.json();
    console.log(`Found ${products.length} products for A230\n`);

    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('First product sample:');
      console.log(`  SKU: ${firstProduct.sku}`);
      console.log(`  ColorCode: ${firstProduct.colorCode}`);
      console.log(`  SizeCode: ${firstProduct.sizeCode}`);
      console.log(`  Qty: ${firstProduct.qty}`);
      console.log(`  Warehouses:`, JSON.stringify(firstProduct.warehouses, null, 2));
      console.log(`  Has warehouses array: ${Array.isArray(firstProduct.warehouses)}`);
      console.log(`  Warehouses length: ${Array.isArray(firstProduct.warehouses) ? firstProduct.warehouses.length : 'N/A'}`);

      // Count products with warehouses
      const withWarehouses = products.filter((p: any) => Array.isArray(p.warehouses) && p.warehouses.length > 0);
      console.log(`\nProducts with warehouses: ${withWarehouses.length}/${products.length}`);
    }
  } catch (error) {
    console.error('Error fetching from API:', error);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

