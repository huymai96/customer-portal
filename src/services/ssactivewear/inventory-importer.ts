/* eslint-disable @typescript-eslint/no-explicit-any */
import { parseStringPromise, processors } from 'xml2js';

import { prisma } from '@/lib/prisma';
import { sanitizeCode } from '@/services/sanmar/importer';
import { getInventoryLevels } from '@/integrations/ssactivewear/inventory';
import { loadConfig } from '@/integrations/ssactivewear/config';

interface InventoryRecord {
  colorCode: string;
  sizeCode: string;
  supplierPartId: string;
  supplierSku: string;
  totalQty: number;
  warehouses: Array<{ warehouseId: string; quantity: number }>;
}

const xmlOptions = {
  explicitArray: false,
  tagNameProcessors: [processors.stripPrefix],
  attrNameProcessors: [processors.stripPrefix],
};

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getText(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof node === 'object' && node !== null) {
    const candidate = (node as { _: unknown })._;
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }
  return null;
}

async function fetchRestInventoryForSku(sku: string): Promise<InventoryRecord | null> {
  const config = loadConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://api.ssactivewear.com/v2/inventory?sku=${encodeURIComponent(sku)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Array<{
      sku: string;
      styleID: number;
      warehouses: Array<{ warehouseAbbr: string; qty: number | string }>;
    }>;

    if (!Array.isArray(payload)) {
      return null;
    }

    const matched = payload.find((entry) => entry && entry.sku === sku);
    if (!matched) {
      return null;
    }

    const warehouses =
      matched.warehouses?.map((warehouse) => ({
        warehouseId: warehouse.warehouseAbbr,
        quantity: Number.parseInt(String(warehouse.qty ?? 0), 10) || 0,
      })) ?? [];

    const totalQty = warehouses.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return {
      colorCode: 'DEFAULT',
      sizeCode: 'OSFA',
      supplierPartId: sku.slice(0, 6).toUpperCase(),
      supplierSku: sku,
      totalQty,
      warehouses,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function computeInventoryRecords(
  supplierPartId: string,
  payload: any
): InventoryRecord[] {
  const records: InventoryRecord[] = [];

  const partArray = ensureArray(payload?.PartInventoryArray?.PartInventory);
  for (const part of partArray) {
    const partId = getText(part.partId) ?? supplierPartId;
    const colorName = getText(part.partColor) ?? 'Default';
    const sizeLabel = getText(part.labelSize) ?? 'OSFA';
    const quantityValue = getText(part.quantityAvailable?.Quantity?.value) ?? '0';

    const colorCode = sanitizeCode(colorName, `${supplierPartId}_DEFAULT`);
    const sizeCode = sanitizeCode(sizeLabel, 'OSFA');

    const warehouses = ensureArray(part.InventoryLocationArray?.InventoryLocation).map(
      (location: any) => ({
        warehouseId: getText(location.inventoryLocationId) ?? 'UNKNOWN',
        quantity:
          Number.parseInt(
            getText(location.inventoryLocationQuantity?.Quantity?.value) ?? '0',
            10
          ) || 0,
      })
    );

    const totalQty =
      Number.parseInt(quantityValue, 10) ||
      warehouses.reduce((sum, warehouse) => sum + (warehouse.quantity || 0), 0);

    records.push({
      colorCode,
      sizeCode,
      supplierPartId,
      supplierSku: partId,
      totalQty,
      warehouses,
    });
  }

  return records;
}

async function fetchPromoInventory(productId: string) {
  const xmlPayload = await getInventoryLevels({ productId });
  const parsed = await parseStringPromise(xmlPayload, xmlOptions);
  return parsed?.Envelope?.Body?.GetInventoryLevelsResponse?.Inventory;
}

export async function importSsactivewearInventory(
  supplierPartId: string
): Promise<'created' | 'updated' | 'skipped'> {
  const upperPartId = supplierPartId.trim().toUpperCase();
  if (!upperPartId) {
    throw new Error('Supplier part ID is required for inventory import');
  }

  const product = await prisma.product.findUnique({
    where: { supplierPartId: upperPartId },
    select: { id: true },
  });

  if (!product) {
    return 'skipped';
  }

  let inventoryRecords: InventoryRecord[] = [];

  try {
    const promoInventory = await fetchPromoInventory(upperPartId);
    inventoryRecords = computeInventoryRecords(upperPartId, promoInventory);
  } catch (error) {
    console.warn('SSActivewear PromoStandards inventory fetch failed', error);
    inventoryRecords = [];
  }

  if (inventoryRecords.length === 0) {
    const productSkus = await prisma.productSku.findMany({
      where: { productId: product.id },
      select: { supplierSku: true, colorCode: true, sizeCode: true },
    });

    const restFallback: InventoryRecord[] = [];
    for (const sku of productSkus) {
      if (!sku.supplierSku) continue;
      const restEntry = await fetchRestInventoryForSku(sku.supplierSku);
      if (restEntry) {
        const colorCode = sku.colorCode ?? 'DEFAULT';
        const sizeCode = sku.sizeCode ?? 'OSFA';
        restFallback.push({
          colorCode,
          sizeCode,
          supplierPartId: upperPartId,
          supplierSku: sku.supplierSku,
          totalQty: restEntry.totalQty,
          warehouses: restEntry.warehouses,
        });
      }
    }
    inventoryRecords = restFallback;
  }

  if (inventoryRecords.length === 0) {
    return 'skipped';
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.productInventory.deleteMany({ where: { supplierPartId: upperPartId } });

    await tx.productInventory.createMany({
      data: inventoryRecords.map((record) => ({
        productId: product.id,
        supplierPartId: upperPartId,
        colorCode: record.colorCode,
        sizeCode: record.sizeCode,
        totalQty: record.totalQty,
        warehouses: record.warehouses,
        fetchedAt: now,
      })),
    });
  });

  return 'updated';
}


