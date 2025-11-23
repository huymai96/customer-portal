#!/usr/bin/env tsx
/**
 * Full SanMar Catalog Sync via FTP/CSV
 * 
 * Downloads the full catalog CSV from SanMar FTP and imports ALL products
 * 
 * Usage:
 *   npx tsx scripts/sync-sanmar-full-catalog-ftp.ts
 *   npx tsx scripts/sync-sanmar-full-catalog-ftp.ts --dryRun  # Test without saving
 */

import 'tsconfig-paths/register';
import path from 'path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { mkdir } from 'fs/promises';
import { importSanmarCatalog } from '../src/services/sanmar/importer';
import { importSanmarEpdd } from '../src/services/sanmar/epdd-importer';
import { downloadSanmarFiles, getSanmarSftpConfig } from '../src/services/sanmar/sftp';

async function main() {
  const dryRun = process.argv.includes('--dryRun');
  const baseDir = path.resolve(process.env.SANMAR_LOCAL_DIR ?? 'tmp/sanmar');
  const sdlPath = process.env.SANMAR_SDL_PATH ?? path.join(baseDir, 'SanMar_SDL_N.csv');
  const epddPath = process.env.SANMAR_EPDD_PATH ?? path.join(baseDir, 'SanMar_EPDD.csv');

  console.log('\n🔄 Starting FULL SanMar catalog sync via FTP/CSV');
  console.log(`   Target Directory: ${baseDir}`);
  console.log(`   SDL File: ${sdlPath}`);
  console.log(`   Dry Run: ${dryRun ? 'YES' : 'NO'}\n`);

  // Step 1: Download catalog file from FTP
  console.log('📥 Step 1: Downloading catalog file from SanMar FTP...');
  await mkdir(baseDir, { recursive: true });

  const sftpConfig = getSanmarSftpConfig();
  const downloaded = await downloadSanmarFiles(
    {
      files: ['SanMar_SDL_N.csv', 'SanMar_EPDD.csv'], // Catalog + Extended Product Data
      targetDir: baseDir,
      overwrite: true,
    },
    sftpConfig
  );

  console.log(`   ✅ Downloaded: ${downloaded.join(', ')}\n`);

  // Step 2: Import catalog from CSV
  console.log('📦 Step 2: Importing catalog from CSV...');
  const startTime = Date.now();

  const result = await importSanmarCatalog({
    sdlPath,
    dryRun,
    // No limit - import ALL products
    // No styleFilter - import ALL styles
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ SanMar catalog import complete');
  console.log(`   Duration: ${duration}s`);
  console.log(`   Products processed: ${result.processed}`);
  console.log(`   Products created: ${result.created}`);
  console.log(`   Products updated: ${result.updated}`);
  console.log(`   Matched styles: ${result.matchedStyles.length}`);
  if (result.missingStyles.length > 0) {
    console.log(`   Missing styles: ${result.missingStyles.length}`);
  }
  console.log('');

  // Step 3: Import EPDD (Extended Product Data)
  console.log('📊 Step 3: Importing EPDD (Extended Product Data)...');
  const epddStartTime = Date.now();

  const epddResult = await importSanmarEpdd({
    epddPath,
    dryRun,
  });

  const epddDuration = ((Date.now() - epddStartTime) / 1000).toFixed(1);

  console.log('\n✅ SanMar EPDD import complete');
  console.log(`   Duration: ${epddDuration}s`);
  console.log(`   Products processed: ${epddResult.processed}`);
  console.log(`   Products updated: ${epddResult.updated}`);
  console.log(`   Matched styles: ${epddResult.matchedStyles.length}`);
  if (epddResult.missingStyles.length > 0) {
    console.log(`   Missing styles: ${epddResult.missingStyles.length}`);
  }
  console.log('');

  if (!dryRun) {
    // Count total products in database
    const { prisma } = await import('../src/lib/prisma');
    const totalProducts = await prisma.product.count({
      where: { supplierPartId: { not: { startsWith: 'SM' } } },
    });
    const totalCanonicalStyles = await prisma.canonicalStyle.count();
    const sanmarProducts = await prisma.product.count({
      where: {
        supplierPartId: {
          not: { startsWith: 'SM' },
        },
      },
    });

    console.log(`📊 Database Summary:`);
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   SanMar Products: ${sanmarProducts}`);
    console.log(`   Total Canonical Styles: ${totalCanonicalStyles}\n`);

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('\n❌ SanMar catalog sync failed:', error);
  process.exitCode = 1;
});

