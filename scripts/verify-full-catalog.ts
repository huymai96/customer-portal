#!/usr/bin/env tsx
/**
 * Full catalog verification script
 * 
 * Iterates over all CanonicalStyle records and verifies:
 * - colors.length > 0
 * - sizes.length > 0
 * - warehouses.length > 0 (if inventory exists)
 * - No duplicate warehouse names in matrix
 * - /product/[canonicalStyleId] returns 200
 * 
 * Usage:
 *   npx tsx scripts/verify-full-catalog.ts [baseUrl]
 */

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { prisma } from '@/lib/prisma';

interface VerificationResult {
  canonicalStyleId: string;
  styleNumber: string;
  displayName: string;
  issues: string[];
  suppliers: Array<{
    supplier: string;
    supplierPartId: string;
    colors: number;
    sizes: number;
    warehouses: number;
    inventoryRows: number;
  }>;
}

async function verifyProduct(baseUrl: string, canonicalStyleId: string): Promise<VerificationResult> {
  const issues: string[] = [];
  const suppliers: VerificationResult['suppliers'] = [];

  try {
    const response = await fetch(`${baseUrl}/api/products/${canonicalStyleId}`);
    if (!response.ok) {
      issues.push(`API returned ${response.status}`);
      return {
        canonicalStyleId,
        styleNumber: 'unknown',
        displayName: 'unknown',
        issues,
        suppliers,
      };
    }

    const data = await response.json();
    const canonicalStyle = data.canonicalStyle;
    const suppliersData = data.suppliers || [];

    // Filter out empty suppliers (no colors, sizes, or inventory)
    const validSuppliers = suppliersData.filter((s: any) => {
      const hasColors = (s.product?.colors?.length ?? 0) > 0;
      const hasSizes = (s.product?.sizes?.length ?? 0) > 0;
      const hasInventory = (s.inventory?.rows?.length ?? 0) > 0;
      return hasColors || hasSizes || hasInventory;
    });

    // Check for empty suppliers (should be flagged)
    const emptySuppliers = suppliersData.filter((s: any) => {
      const hasColors = (s.product?.colors?.length ?? 0) > 0;
      const hasSizes = (s.product?.sizes?.length ?? 0) > 0;
      const hasInventory = (s.inventory?.rows?.length ?? 0) > 0;
      return !hasColors && !hasSizes && !hasInventory;
    });

    if (emptySuppliers.length > 0) {
      for (const empty of emptySuppliers) {
        issues.push(`Empty supplier: ${empty.supplier} (${empty.supplierPartId}) has 0 colors, 0 sizes, 0 inventory`);
      }
    }

    if (validSuppliers.length === 0) {
      issues.push('No suppliers with data (all have 0 colors, 0 sizes, 0 inventory)');
    }

    for (const supplier of validSuppliers) {
      const colors = supplier.product?.colors?.length ?? 0;
      const sizes = supplier.product?.sizes?.length ?? 0;
      const warehouses = supplier.inventory?.warehouses?.length ?? 0;
      const inventoryRows = supplier.inventory?.rows?.length ?? 0;

      suppliers.push({
        supplier: supplier.supplier,
        supplierPartId: supplier.supplierPartId,
        colors,
        sizes,
        warehouses,
        inventoryRows,
      });

      if (colors === 0) {
        issues.push(`${supplier.supplier} (${supplier.supplierPartId}): 0 colors`);
      }
      if (sizes === 0) {
        issues.push(`${supplier.supplier} (${supplier.supplierPartId}): 0 sizes`);
      }
      if (inventoryRows > 0 && warehouses === 0) {
        issues.push(`${supplier.supplier} (${supplier.supplierPartId}): Has inventory rows but 0 warehouses`);
      }

      // Check for duplicate warehouse display names
      if (warehouses > 0 && inventoryRows > 0) {
        const warehouseDisplayNames = new Set<string>();
        const duplicates: string[] = [];
        for (const wh of supplier.inventory.warehouses) {
          // Simple check - if warehouseId maps to same display name, it's a duplicate
          const displayName = wh.warehouseName || wh.warehouseId;
          if (warehouseDisplayNames.has(displayName)) {
            duplicates.push(displayName);
          }
          warehouseDisplayNames.add(displayName);
        }
        if (duplicates.length > 0) {
          issues.push(`${supplier.supplier} (${supplier.supplierPartId}): Duplicate warehouse names: ${duplicates.join(', ')}`);
        }
      }
    }

    // Check product page returns 200
    const pageResponse = await fetch(`${baseUrl}/product/${canonicalStyleId}`, { redirect: 'manual' });
    if (pageResponse.status !== 200 && pageResponse.status !== 307) {
      issues.push(`Product page returned ${pageResponse.status}`);
    }

    return {
      canonicalStyleId,
      styleNumber: canonicalStyle?.styleNumber || 'unknown',
      displayName: canonicalStyle?.displayName || 'unknown',
      issues,
      suppliers,
    };
  } catch (error) {
    issues.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      canonicalStyleId,
      styleNumber: 'unknown',
      displayName: 'unknown',
      issues,
      suppliers,
    };
  }
}

async function main() {
  const baseUrl = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log(`\n🔍 Verifying full catalog against ${baseUrl}\n`);

  const canonicalStyles = await prisma.canonicalStyle.findMany({
    select: { id: true, styleNumber: true, displayName: true },
    orderBy: { styleNumber: 'asc' },
  });

  console.log(`Found ${canonicalStyles.length} canonical styles\n`);

  const results: VerificationResult[] = [];
  let processed = 0;

  for (const style of canonicalStyles) {
    processed++;
    if (processed % 10 === 0) {
      console.log(`Processing ${processed}/${canonicalStyles.length}...`);
    }
    const result = await verifyProduct(baseUrl, style.id);
    if (result.issues.length > 0) {
      results.push(result);
    }
    // Small delay to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Verification complete\n`);
  console.log(`Total styles: ${canonicalStyles.length}`);
  console.log(`Styles with issues: ${results.length}\n`);

  if (results.length === 0) {
    console.log('🎉 All styles passed verification!\n');
    return;
  }

  console.log('📋 Issues found:\n');
  for (const result of results) {
    console.log(`\n=== ${result.styleNumber} (${result.displayName}) ===`);
    console.log(`CanonicalStyleId: ${result.canonicalStyleId}`);
    console.log(`Suppliers: ${result.suppliers.length}`);
    for (const supplier of result.suppliers) {
      console.log(`  - ${supplier.supplier} (${supplier.supplierPartId}): ${supplier.colors} colors, ${supplier.sizes} sizes, ${supplier.warehouses} warehouses, ${supplier.inventoryRows} inventory rows`);
    }
    console.log(`Issues (${result.issues.length}):`);
    for (const issue of result.issues) {
      console.log(`  ❌ ${issue}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Total styles: ${canonicalStyles.length}`);
  console.log(`  Styles with issues: ${results.length}`);
  console.log(`  Success rate: ${((canonicalStyles.length - results.length) / canonicalStyles.length * 100).toFixed(1)}%\n`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});


