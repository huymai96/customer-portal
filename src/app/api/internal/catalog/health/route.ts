import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getCanonicalProductDetail } from '@/services/product-service';

export const runtime = 'nodejs';

interface HealthIssue {
  canonicalStyleId: string;
  styleNumber: string;
  displayName: string;
  brand?: string | null;
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

export async function GET() {
  try {
    const canonicalStyles = await prisma.canonicalStyle.findMany({
      select: { id: true, styleNumber: true, displayName: true, brand: true },
      orderBy: { styleNumber: 'asc' },
    });

    const issues: HealthIssue[] = [];

    // Check each style (limit to avoid timeout - can be optimized later)
    for (const style of canonicalStyles) {
      try {
        const detail = await getCanonicalProductDetail(style.id);
        if (!detail) continue;

        const styleIssues: string[] = [];
        const suppliersData: HealthIssue['suppliers'] = [];

        // Filter out empty suppliers
        const validSuppliers = detail.suppliers.filter((s) => {
          const hasColors = (s.product?.colors?.length ?? 0) > 0;
          const hasSizes = (s.product?.sizes?.length ?? 0) > 0;
          const hasInventory = (s.inventory?.rows?.length ?? 0) > 0;
          return hasColors || hasSizes || hasInventory;
        });

        // Check for empty suppliers
        const emptySuppliers = detail.suppliers.filter((s) => {
          const hasColors = (s.product?.colors?.length ?? 0) > 0;
          const hasSizes = (s.product?.sizes?.length ?? 0) > 0;
          const hasInventory = (s.inventory?.rows?.length ?? 0) > 0;
          return !hasColors && !hasSizes && !hasInventory;
        });

        if (emptySuppliers.length > 0) {
          for (const empty of emptySuppliers) {
            styleIssues.push(`Empty supplier: ${empty.supplier} (${empty.supplierPartId}) has 0 colors, 0 sizes, 0 inventory`);
          }
        }

        if (validSuppliers.length === 0) {
          styleIssues.push('No suppliers with data (all have 0 colors, 0 sizes, 0 inventory)');
        }

        for (const supplier of validSuppliers) {
          const colors = supplier.product?.colors?.length ?? 0;
          const sizes = supplier.product?.sizes?.length ?? 0;
          const warehouses = supplier.inventory?.warehouses?.length ?? 0;
          const inventoryRows = supplier.inventory?.rows?.length ?? 0;

          suppliersData.push({
            supplier: supplier.supplier,
            supplierPartId: supplier.supplierPartId,
            colors,
            sizes,
            warehouses,
            inventoryRows,
          });

          if (colors === 0) {
            styleIssues.push(`${supplier.supplier} (${supplier.supplierPartId}): 0 colors`);
          }
          if (sizes === 0) {
            styleIssues.push(`${supplier.supplier} (${supplier.supplierPartId}): 0 sizes`);
          }
          if (inventoryRows > 0 && warehouses === 0) {
            styleIssues.push(`${supplier.supplier} (${supplier.supplierPartId}): Has inventory rows but 0 warehouses`);
          }

          // Check for duplicate warehouse display names
          if (warehouses > 0 && inventoryRows > 0) {
            const warehouseDisplayNames = new Set<string>();
            const duplicates: string[] = [];
            for (const wh of supplier.inventory.warehouses) {
              const displayName = wh.warehouseName || wh.warehouseId;
              if (warehouseDisplayNames.has(displayName)) {
                duplicates.push(displayName);
              }
              warehouseDisplayNames.add(displayName);
            }
            if (duplicates.length > 0) {
              styleIssues.push(`${supplier.supplier} (${supplier.supplierPartId}): Duplicate warehouse names: ${duplicates.join(', ')}`);
            }
          }
        }

        if (styleIssues.length > 0) {
          issues.push({
            canonicalStyleId: style.id,
            styleNumber: style.styleNumber,
            displayName: style.displayName,
            brand: style.brand,
            issues: styleIssues,
            suppliers: suppliersData,
          });
        }
      } catch (error) {
        // Skip styles that fail to load
        console.error(`[Health Check] Error checking ${style.styleNumber}:`, error);
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalStyles: canonicalStyles.length,
      stylesWithIssues: issues.length,
      successRate: ((canonicalStyles.length - issues.length) / canonicalStyles.length * 100).toFixed(1),
      issues,
    });
  } catch (error) {
    console.error('[Health Check] Fatal error:', error);
    return NextResponse.json(
      { error: 'Health check failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

