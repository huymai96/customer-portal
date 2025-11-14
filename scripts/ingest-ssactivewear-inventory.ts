#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import { importSsactivewearInventory } from '@/services/ssactivewear/inventory-importer';

interface CliOptions {
  productIds: string[];
}

function parseArgs(): CliOptions {
  const productIds: string[] = [];

  for (const arg of process.argv.slice(2)) {
    productIds.push(arg);
  }

  return { productIds };
}

async function main() {
  const options = parseArgs();

  if (options.productIds.length === 0) {
    console.info('No product IDs provided. Usage: npm run ingest:ssa:inventory <productId> [...]');
    return;
  }

  for (const productId of options.productIds) {
    try {
      const result = await importSsactivewearInventory(productId);
      console.info(`Inventory ${productId}: ${result}`);
    } catch (error) {
      console.error(`Failed to ingest SSActivewear inventory for ${productId}:`, error);
    }
  }
}

main().catch((error) => {
  console.error('Failed to ingest SSActivewear inventory:', error);
  process.exit(1);
});

