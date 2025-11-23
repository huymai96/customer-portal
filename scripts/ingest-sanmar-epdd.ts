#!/usr/bin/env tsx
/**
 * Import SanMar EPDD (Extended Product Data) file
 * 
 * Processes SanMar_EPDD.csv to extract:
 * - Bulk inventory data
 * - Main category and subcategory
 * - Additional product attributes
 * - Pricing information
 * 
 * Usage:
 *   npx tsx scripts/ingest-sanmar-epdd.ts
 *   npx tsx scripts/ingest-sanmar-epdd.ts --dryRun
 */

import 'tsconfig-paths/register';
import path from 'path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { importSanmarEpdd } from '../src/services/sanmar/epdd-importer';

async function main() {
  const baseDir = path.resolve(process.env.SANMAR_LOCAL_DIR ?? 'tmp/sanmar');
  const epddPath = process.env.SANMAR_EPDD_PATH ?? path.join(baseDir, 'SanMar_EPDD.csv');
  const dryRun = process.argv.includes('--dryRun');

  console.log('Importing SanMar EPDD (Extended Product Data)', { epddPath, dryRun });

  const result = await importSanmarEpdd({ epddPath, dryRun });
  console.log('SanMar EPDD import complete', result);
}

main().catch((error) => {
  console.error('SanMar EPDD import failed', error);
  process.exitCode = 1;
});


