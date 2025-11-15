import { NextRequest, NextResponse } from 'next/server';
import { SupplierSource } from '@prisma/client';
import { loadConfig } from '@/integrations/ssactivewear/config';
import { prisma } from '@/lib/prisma';
import { ensureCanonicalStyleLink, guessCanonicalStyleNumber } from '@/services/canonical-style';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

interface SsaStyle {
  styleID: number;
  partNumber: string;
  brandName: string;
  styleName: string;
  title?: string;
  description?: string;
  newStyle?: boolean;
}

interface SsaProduct {
  sku: string;
  colorCode?: string;
  colorName?: string;
  colorSwatchImage?: string;
  colorFrontImage?: string;
  colorBackImage?: string;
  colorSideImage?: string;
  sizeCode?: string;
  sizeName?: string;
  sizeOrder?: string | number;
}

async function fetchAllStyles(): Promise<SsaStyle[]> {
  const config = loadConfig();
  const auth = `Basic ${Buffer.from(`${config.accountNumber}:${config.apiKey}`).toString('base64')}`;
  
  const response = await fetch(`${config.restBaseUrl}/styles/`, {
    headers: { Authorization: auth },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch styles: ${response.status}`);
  }

  return response.json();
}

async function fetchProductsForStyle(partNumber: string): Promise<SsaProduct[]> {
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

async function syncStyle(style: SsaStyle): Promise<void> {
  const products = await fetchProductsForStyle(style.partNumber);
  
  if (products.length === 0) {
    return;
  }

  const colors = new Map<string, { colorName: string; colorCode: string; swatchUrl?: string }>();
  const sizes = new Map<string, { code: string; display: string; sort: number }>();
  const skuMap: Array<{ colorCode: string; sizeCode: string; supplierSku: string }> = [];
  const mediaMap = new Map<string, Set<string>>();

  for (const product of products) {
    const colorCode = product.colorCode || 'DEFAULT';
    const colorName = product.colorName || 'Default';
    
    if (!colors.has(colorCode)) {
      colors.set(colorCode, { colorName, colorCode, swatchUrl: product.colorSwatchImage });
    }

    const sizeCode = product.sizeCode || 'OSFA';
    const sizeName = product.sizeName || 'One Size';
    const sizeOrder = Number.parseInt(String(product.sizeOrder || 0), 10) || 0;
    
    if (!sizes.has(sizeCode)) {
      sizes.set(sizeCode, { code: sizeCode, display: sizeName, sort: sizeOrder });
    }

    skuMap.push({ colorCode, sizeCode, supplierSku: product.sku });

    const mediaSet = mediaMap.get(colorCode) || new Set<string>();
    [product.colorFrontImage, product.colorBackImage, product.colorSideImage]
      .filter(Boolean)
      .forEach((url) => mediaSet.add(url!));
    mediaMap.set(colorCode, mediaSet);
  }

  await prisma.product.upsert({
    where: { supplierPartId: style.partNumber },
    create: {
      supplierPartId: style.partNumber,
      name: style.title || style.styleName,
      brand: style.brandName,
      defaultColor: colors.values().next().value?.colorCode || 'DEFAULT',
      description: style.description ? [style.description] : undefined,
      colors: { create: Array.from(colors.values()).map((c) => ({ colorCode: c.colorCode, colorName: c.colorName, swatchUrl: c.swatchUrl })) },
      sizes: { create: Array.from(sizes.values()) },
      skus: { create: skuMap },
      media: {
        create: Array.from(mediaMap.entries()).flatMap(([colorCode, urls]) =>
          Array.from(urls).map((url, index) => ({ colorCode, url, position: index }))
        ),
      },
    },
    update: {
      name: style.title || style.styleName,
      brand: style.brandName,
      colors: { deleteMany: {}, create: Array.from(colors.values()).map((c) => ({ colorCode: c.colorCode, colorName: c.colorName, swatchUrl: c.swatchUrl })) },
      sizes: { deleteMany: {}, create: Array.from(sizes.values()) },
      skus: { deleteMany: {}, create: skuMap },
      media: {
        deleteMany: {},
        create: Array.from(mediaMap.entries()).flatMap(([colorCode, urls]) =>
          Array.from(urls).map((url, index) => ({ colorCode, url, position: index }))
        ),
      },
    },
  });

  await ensureCanonicalStyleLink(prisma, {
    supplier: SupplierSource.SSACTIVEWEAR,
    supplierPartId: style.partNumber,
    styleNumber: guessCanonicalStyleNumber({
      supplier: SupplierSource.SSACTIVEWEAR,
      supplierPartId: style.partNumber,
      brand: style.brandName,
    }),
    displayName: style.title || style.styleName,
    brand: style.brandName,
  });
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[SSA Incremental Sync] Starting...');
    
    const allStyles = await fetchAllStyles();
    
    const existingProducts = await prisma.product.findMany({
      where: { supplierPartId: { not: { startsWith: 'SM' } } },
      select: { supplierPartId: true },
    });

    const existingPartNumbers = new Set(existingProducts.map((p) => p.supplierPartId));
    const newStyles = allStyles.filter((style) => !existingPartNumbers.has(style.partNumber));
    
    console.log(`[SSA Incremental Sync] Found ${newStyles.length} new styles`);

    let successCount = 0;
    let errorCount = 0;

    // Sync up to 50 new styles per run (to stay within time limits)
    const stylesToSync = newStyles.slice(0, 50);

    for (const style of stylesToSync) {
      try {
        await syncStyle(style);
        successCount++;
        await new Promise((resolve) => setTimeout(resolve, 1100)); // Rate limiting
      } catch (error) {
        errorCount++;
        console.error(`[SSA Incremental Sync] Error syncing ${style.brandName} ${style.styleName}:`, error);
      }
    }

    console.log(`[SSA Incremental Sync] Complete: ${successCount} success, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      totalNewStyles: newStyles.length,
      synced: successCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error('[SSA Incremental Sync] Fatal error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

