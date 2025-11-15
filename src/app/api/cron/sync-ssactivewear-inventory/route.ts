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

  const inventoryMap = new Map<string, number>();
  
  for (const product of products) {
    const colorCode = product.colorCode || 'DEFAULT';
    const sizeCode = product.sizeCode || 'OSFA';
    const key = `${colorCode}::${sizeCode}`;
    
    let totalQty = 0;
    if (product.warehouses && Array.isArray(product.warehouses)) {
      for (const warehouse of product.warehouses) {
        totalQty += Number.parseInt(String(warehouse.qty || 0), 10) || 0;
      }
    } else if (product.qty != null) {
      totalQty = Number.parseInt(String(product.qty), 10) || 0;
    }
    
    inventoryMap.set(key, (inventoryMap.get(key) || 0) + totalQty);
  }

  const now = new Date();
  for (const [key, totalQty] of inventoryMap.entries()) {
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
        totalQty,
        fetchedAt: now,
      },
      update: {
        totalQty,
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

