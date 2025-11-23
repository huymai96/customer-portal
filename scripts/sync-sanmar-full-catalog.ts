#!/usr/bin/env tsx
/**
 * Full SanMar Catalog Sync
 * 
 * Syncs ALL products from SanMar's SOAP API without limits
 * 
 * Usage:
 *   npx tsx scripts/sync-sanmar-full-catalog.ts
 *   npx tsx scripts/sync-sanmar-full-catalog.ts --dryRun  # Test without saving
 */

import 'tsconfig-paths/register';
import path from 'node:path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import type { PrismaClient } from '@prisma/client';

import { prisma } from '../src/lib/prisma';
import { syncSanmarCatalog } from '../src/services/sanmar/catalog';
import { buildSanMarAuthHeader, getSanMarClient } from '../src/lib/sanmar/soapClient';
import type { GenericSoapClient } from '../src/lib/sanmar/soapClient';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function resolveSoapClient(): Promise<GenericSoapClient> {
  const wsdlUrl = requireEnv('SANMAR_PRODUCT_WSDL');
  const username = requireEnv('SANMAR_USER');
  const password = requireEnv('SANMAR_PASSWORD');
  const namespacePrefix = process.env.SANMAR_SOAP_NAMESPACE_PREFIX ?? 'tem';
  const namespaceUri =
    process.env.SANMAR_SOAP_NAMESPACE_URI ?? 'http://tempuri.org/';
  const endpoint = process.env.SANMAR_PRODUCT_ENDPOINT;

  const authHeader = buildSanMarAuthHeader({
    username,
    password,
    namespacePrefix,
    namespaceUri,
  });

  return getSanMarClient({
    wsdlUrl,
    endpoint,
    authHeaderXml: authHeader,
    namespacePrefix,
    namespaceUri,
  });
}

async function main() {
  const dryRun = process.argv.includes('--dryRun');
  const pageSize = Number.parseInt(process.env.SANMAR_CATALOG_PAGE_SIZE ?? '100', 10);

  console.log('\n🔄 Starting FULL SanMar catalog sync');
  console.log(`   Page Size: ${pageSize}`);
  console.log(`   Dry Run: ${dryRun ? 'YES' : 'NO'}`);
  console.log(`   Max Pages: UNLIMITED (will fetch all products)\n`);

  const client = await resolveSoapClient();
  
  const startTime = Date.now();
  const result = await syncSanmarCatalog(prisma as PrismaClient, {
    soapClient: client,
    pageSize,
    // No maxPages - fetch everything
    // No modifiedSince - fetch everything
    dryRun,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ SanMar catalog sync complete');
  console.log(`   Duration: ${duration}s`);
  console.log(`   Pages processed: ${result.pages}`);
  console.log(`   Products fetched: ${result.fetched}`);
  console.log(`   Products created: ${result.created}`);
  console.log(`   Products updated: ${result.updated}`);
  console.log(`   Total processed: ${result.processed}\n`);

  if (!dryRun) {
    // Count total products in database
    const totalProducts = await prisma.product.count({
      where: { supplierPartId: { startsWith: 'SM' } },
    });
    const totalCanonicalStyles = await prisma.canonicalStyle.count();
    
    console.log(`📊 Database Summary:`);
    console.log(`   Total SanMar Products: ${totalProducts}`);
    console.log(`   Total Canonical Styles: ${totalCanonicalStyles}\n`);
  }
}

main()
  .catch((error) => {
    console.error('\n❌ SanMar catalog sync failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

