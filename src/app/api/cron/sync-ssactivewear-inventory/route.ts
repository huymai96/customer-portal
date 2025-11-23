import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/integrations/ssactivewear/config';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface SsaProduct {
  sku: string;
  colorCode?: string;
  sizeCode?: string;
  qty?: number | string;
  warehouses?: Array<{
    warehouseAbbr: string;
    qty: number | string;
  }>;
}

async function fetchInventoryForPartNumber(partNumber: string): Promise<SsaProduct[]> {
  const config = loadConfig();
  const auth = `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`;
  
  const response = await fetch(`${config.restBaseUrl}/products/?partnumber=${partNumber}`, {
    headers: { Authorization: auth },
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

async function syncInventoryForProduct(supplierPartId: string): Promise<number> {
  const products = await fetchInventoryForPartNumber(supplierPartId);
  
  if (products.length === 0) {
    return 0;
  }

  const inventoryMap = new Map<string, { totalQty: number; warehouses: Array<{ warehouseId: string; warehouseName?: string; quantity: number }> }>();
  
  for (const product of products) {
    const colorCode = product.colorCode || 'DEFAULT';
    const sizeCode = product.sizeCode || 'OSFA';
    const key = `${colorCode}::${sizeCode}`;
    
    let totalQty = 0;
    const warehouses: Array<{ warehouseId: string; warehouseName?: string; quantity: number }> = [];
    
    if (product.warehouses && Array.isArray(product.warehouses)) {
      for (const warehouse of product.warehouses) {
        const qty = Number.parseInt(String(warehouse.qty || 0), 10) || 0;
        totalQty += qty;
        if (qty > 0 || warehouse.warehouseAbbr) {
          warehouses.push({
            warehouseId: warehouse.warehouseAbbr || 'UNKNOWN',
            warehouseName: warehouse.warehouseAbbr || undefined,
            quantity: qty,
          });
        }
      }
    } else if (product.qty != null) {
      totalQty = Number.parseInt(String(product.qty), 10) || 0;
    }
    
    const existing = inventoryMap.get(key);
    if (existing) {
      existing.totalQty += totalQty;
      // Merge warehouses by warehouseId
      const warehouseMap = new Map<string, { warehouseId: string; warehouseName?: string; quantity: number }>();
      for (const wh of existing.warehouses) {
        warehouseMap.set(wh.warehouseId, wh);
      }
      for (const wh of warehouses) {
        const existingWh = warehouseMap.get(wh.warehouseId);
        if (existingWh) {
          existingWh.quantity += wh.quantity;
        } else {
          warehouseMap.set(wh.warehouseId, wh);
        }
      }
      existing.warehouses = Array.from(warehouseMap.values());
    } else {
      inventoryMap.set(key, { totalQty, warehouses });
    }
  }

  const now = new Date();
  for (const [key, data] of inventoryMap.entries()) {
    const [colorCode, sizeCode] = key.split('::');
    
    await prisma.productInventory.upsert({
      where: {
        supplierPartId_colorCode_sizeCode: {
          supplierPartId,
          colorCode,
          sizeCode,
        },
      },
      create: {
        supplierPartId,
        colorCode,
        sizeCode,
        totalQty: data.totalQty,
        warehouses: data.warehouses.length > 0 ? data.warehouses : undefined,
        fetchedAt: now,
      },
      update: {
        totalQty: data.totalQty,
        warehouses: data.warehouses.length > 0 ? data.warehouses : undefined,
        fetchedAt: now,
      },
    });
  }

  return inventoryMap.size;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[SSA Inventory Sync] Starting...');
    
    // Get SSActivewear products (limit to 100 per run to stay within time limits)
    const products = await prisma.product.findMany({
      where: {
        supplierPartId: {
          not: { startsWith: 'SM' },
        },
      },
      select: {
        supplierPartId: true,
        brand: true,
      },
      take: 100,
      orderBy: {
        updatedAt: 'asc', // Prioritize least recently updated
      },
    });

    console.log(`[SSA Inventory Sync] Syncing ${products.length} products`);

    let successCount = 0;
    let errorCount = 0;
    let totalSkus = 0;

    for (const product of products) {
      try {
        const skuCount = await syncInventoryForProduct(product.supplierPartId);
        totalSkus += skuCount;
        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 1100)); // Rate limiting
      } catch (error) {
        errorCount++;
        console.error(`[SSA Inventory Sync] Error syncing ${product.supplierPartId}:`, error);
      }
    }

    console.log(`[SSA Inventory Sync] Complete: ${successCount} products, ${totalSkus} SKUs updated`);

    return NextResponse.json({
      success: true,
      products: successCount,
      skus: totalSkus,
      errors: errorCount,
    });
  } catch (error) {
    console.error('[SSA Inventory Sync] Fatal error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

