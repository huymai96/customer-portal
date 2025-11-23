#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'node:path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

const DEFAULT_BASE = process.env.CHECK_SKUS_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const DEFAULT_SKUS = ['PC54', 'PC61', 'ST350', 'C1717', '5000', '64000', '8000', 'A200', 'A210', 'A230'];

async function main() {
  const [base = DEFAULT_BASE, ...skuArgs] = process.argv.slice(2);
  const skus = skuArgs.length ? skuArgs : DEFAULT_SKUS;

  console.log(`Verifying ${skus.length} SKUs against ${base}`);
  for (const sku of skus) {
    const summary = await inspectSku(base, sku);
    console.log(JSON.stringify(summary));
  }
}

async function inspectSku(base: string, sku: string) {
  try {
    const searchUrl = new URL('/api/products/search', base);
    searchUrl.searchParams.set('query', sku);
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      return { sku, error: `search ${searchRes.status}` };
    }
    const searchJson = (await searchRes.json()) as {
      items?: Array<{ canonicalStyleId?: string }>;
    };
    const directHit = searchJson?.items?.[0];
    if (!directHit?.canonicalStyleId) {
      return { sku, error: 'no canonical style found' };
    }

    const detailUrl = new URL(`/api/products/${directHit.canonicalStyleId}`, base);
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) {
      return { sku, error: `detail ${detailRes.status}` };
    }
    const detail = (await detailRes.json()) as {
      canonicalStyle?: { id: string; styleNumber: string };
      suppliers: Array<{
        supplier: string;
        supplierPartId: string;
        product?: { colors?: unknown[]; sizes?: unknown[] };
        inventory: { rows: unknown[]; warehouses: unknown[] };
      }>;
    };

    return {
      sku,
      canonicalStyleId: detail.canonicalStyle?.id,
      suppliers: detail.suppliers.map((supplier) => ({
        supplier: supplier.supplier,
        supplierPartId: supplier.supplierPartId,
        colors: supplier.product?.colors?.length ?? 0,
        sizes: supplier.product?.sizes?.length ?? 0,
        inventoryRows: supplier.inventory.rows.length,
        warehouses: supplier.inventory.warehouses.length,
      })),
    };
  } catch (error) {
    return { sku, error: error instanceof Error ? error.message : String(error) };
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

