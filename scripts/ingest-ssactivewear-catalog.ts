#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import { importSsactivewearProduct } from '@/services/ssactivewear/catalog-importer';

interface CliOptions {
  productIds: string[];
  modifiedSince?: Date;
}

function parseArgs(): CliOptions {
  const productIds: string[] = [];
  let modifiedSince: Date | undefined;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--modified-since=')) {
      const [, value] = arg.split('=');
      if (value) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          modifiedSince = parsed;
        } else {
          throw new Error(`Invalid --modified-since value: ${value}`);
        }
      }
    } else {
      productIds.push(arg);
    }
  }

  return { productIds, modifiedSince };
}

async function main() {
  const options = parseArgs();

  if (options.productIds.length === 0) {
    console.info('No product IDs provided. Usage: npm run ingest:ssa:catalog <productId> [...]');
    return;
  }

  for (const productId of options.productIds) {
    try {
      const result = await importSsactivewearProduct(productId);
      console.info(`Product ${productId}: ${result}`);
    } catch (error) {
      console.error(`Failed to ingest SSActivewear product ${productId}:`, error);
    }
  }
}

main().catch((error) => {
  console.error('Failed to ingest SSActivewear catalog:', error);
  process.exit(1);
});

