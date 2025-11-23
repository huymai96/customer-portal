import type {
  Prisma,
  SupplierSource,
  ProductColor,
  ProductSize,
  ProductMedia,
  ProductSku,
  ProductInventory,
} from '@prisma/client';

import { prisma } from '@/lib/prisma';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    colors: true;
    sizes: true;
    media: true;
    skus: true;
  };
}>;

export interface InventoryWarehouseEntry {
  warehouseId: string;
  warehouseName?: string | null;
  quantity: number;
}

export interface SupplierProductDetail {
  supplier: SupplierSource;
  supplierPartId: string;
  product: {
    supplierPartId: string;
    name: string;
    brand: string | null;
    description?: unknown;
    colors: ProductColor[];
    sizes: ProductSize[];
    media: ProductMedia[];
    skus: ProductSku[];
  } | null;
  inventory: {
    rows: Array<{
      colorCode: string;
      sizeCode: string;
      totalQty: number;
      warehouses?: InventoryWarehouseEntry[];
    }>;
    warehouses: InventoryWarehouseEntry[];
  };
}

export interface CanonicalProductDetail {
  canonicalStyle: {
    id: string;
    styleNumber: string;
    displayName: string;
    brand?: string | null;
  };
  suppliers: SupplierProductDetail[];
}

export async function getCanonicalProductDetail(
  canonicalStyleId: string
): Promise<CanonicalProductDetail | null> {
  const canonicalStyle = await prisma.canonicalStyle.findUnique({
    where: { id: canonicalStyleId },
    include: {
      supplierLinks: true,
    },
  });

  if (!canonicalStyle) {
    return null;
  }

  const suppliers = await Promise.all(
    canonicalStyle.supplierLinks.map(async (link) => {
      const product = await prisma.product.findUnique({
        where: { supplierPartId: link.supplierPartId },
        include: {
          colors: true,
          sizes: true,
          media: true,
          skus: true,
        },
      });

      const inventoryRows = await prisma.productInventory.findMany({
        where: {
          supplierPartId: link.supplierPartId,
        },
      });

      const formattedInventory = formatInventory(inventoryRows);

      // Derive colors and sizes from inventory if Product table is incomplete
      const derivedColors = deriveColorsFromInventory(inventoryRows, product?.colors ?? []);
      const derivedSizes = deriveSizesFromInventory(inventoryRows, product?.sizes ?? []);

      // Merge Product colors/sizes with inventory-derived ones
      const mergedProduct = product
        ? {
            ...formatProduct(product),
            colors: mergeColors(product.colors, derivedColors),
            sizes: mergeSizes(product.sizes, derivedSizes),
          }
        : {
            supplierPartId: link.supplierPartId,
            name: canonicalStyle.displayName,
            brand: canonicalStyle.brand ?? null,
            description: undefined,
            colors: derivedColors,
            sizes: derivedSizes,
            media: [],
            skus: [],
          };

      return {
        supplier: link.supplier,
        supplierPartId: link.supplierPartId,
        product: mergedProduct,
        inventory: formattedInventory,
      };
    })
  );

  return {
    canonicalStyle: {
      id: canonicalStyle.id,
      styleNumber: canonicalStyle.styleNumber,
      displayName: canonicalStyle.displayName,
      brand: canonicalStyle.brand,
    },
    suppliers,
  };
}

function formatProduct(product: ProductWithRelations) {
  return {
    supplierPartId: product.supplierPartId,
    name: product.name,
    brand: product.brand ?? null,
    description: product.description ?? undefined,
    colors: product.colors,
    sizes: product.sizes,
    media: product.media,
    skus: product.skus,
  };
}

function formatInventory(rows: ProductInventory[]) {
  const formattedRows = rows.map((row) => ({
    colorCode: row.colorCode,
    sizeCode: row.sizeCode,
    totalQty: row.totalQty,
    warehouses: parseWarehouses(row.warehouses),
  }));

  // Collect ALL unique warehouses from ALL inventory rows (even with zero quantities)
  const warehouseDirectory = new Map<string, InventoryWarehouseEntry>();
  for (const row of formattedRows) {
    if (!row.warehouses) continue;
    for (const warehouse of row.warehouses) {
      if (!warehouseDirectory.has(warehouse.warehouseId)) {
        warehouseDirectory.set(warehouse.warehouseId, {
          warehouseId: warehouse.warehouseId,
          warehouseName: warehouse.warehouseName,
          quantity: 0, // Directory entry, not a total
        });
      }
    }
  }

  // Also calculate totals for display
  const warehouseTotals = new Map<string, InventoryWarehouseEntry>();
  for (const row of formattedRows) {
    if (!row.warehouses) continue;
    for (const warehouse of row.warehouses) {
      const existing = warehouseTotals.get(warehouse.warehouseId);
      if (existing) {
        existing.quantity += warehouse.quantity;
      } else {
        warehouseTotals.set(warehouse.warehouseId, { ...warehouse });
      }
    }
  }

  // Return directory (all warehouses) and totals (for reference)
  return {
    rows: formattedRows,
    warehouses: Array.from(warehouseDirectory.values()),
  };
}

function parseWarehouses(value: unknown): InventoryWarehouseEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entries: InventoryWarehouseEntry[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === 'object' &&
      'warehouseId' in item &&
      typeof (item as InventoryWarehouseEntry).warehouseId === 'string'
    ) {
      entries.push({
        warehouseId: (item as InventoryWarehouseEntry).warehouseId,
        warehouseName: (item as InventoryWarehouseEntry).warehouseName,
        quantity: Number((item as InventoryWarehouseEntry).quantity) || 0,
      });
    }
  }
  return entries.length ? entries : undefined;
}

function deriveColorsFromInventory(
  inventoryRows: ProductInventory[],
  existingColors: ProductColor[]
): ProductColor[] {
  const colorMap = new Map<string, ProductColor>();
  
  // Start with existing colors
  for (const color of existingColors) {
    colorMap.set(color.colorCode.toUpperCase(), color);
  }

  // Find a valid productId from inventory rows (for derived colors)
  const validProductId = inventoryRows.find((r) => r.productId)?.productId ?? 'derived';

  // Add colors from inventory that don't exist in Product table
  for (const row of inventoryRows) {
    const code = row.colorCode.toUpperCase();
    if (!colorMap.has(code)) {
      colorMap.set(code, {
        id: `derived-${code}`,
        productId: row.productId ?? validProductId,
        colorCode: row.colorCode,
        colorName: formatColorName(row.colorCode),
        supplierVariantId: null,
        swatchUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ProductColor);
    }
  }

  return Array.from(colorMap.values());
}

function deriveSizesFromInventory(
  inventoryRows: ProductInventory[],
  existingSizes: ProductSize[]
): ProductSize[] {
  const sizeMap = new Map<string, ProductSize>();
  
  // Start with existing sizes
  for (const size of existingSizes) {
    sizeMap.set(size.sizeCode.toUpperCase(), size);
  }

  // Find a valid productId from inventory rows (for derived sizes)
  const validProductId = inventoryRows.find((r) => r.productId)?.productId ?? 'derived';

  // Add sizes from inventory that don't exist in Product table
  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
  for (const row of inventoryRows) {
    const code = row.sizeCode.toUpperCase();
    if (!sizeMap.has(code)) {
      const sortIndex = sizeOrder.findIndex((s) => s.toUpperCase() === code);
      sizeMap.set(code, {
        id: `derived-${code}`,
        productId: row.productId ?? validProductId,
        sizeCode: row.sizeCode,
        display: row.sizeCode,
        sort: sortIndex >= 0 ? sortIndex : 999,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ProductSize);
    }
  }

  return Array.from(sizeMap.values()).sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
}

function mergeColors(existing: ProductColor[], derived: ProductColor[]): ProductColor[] {
  const merged = new Map<string, ProductColor>();
  for (const color of [...existing, ...derived]) {
    const key = color.colorCode.toUpperCase();
    if (!merged.has(key)) {
      merged.set(key, color);
    }
  }
  return Array.from(merged.values()).sort((a, b) => a.colorCode.localeCompare(b.colorCode));
}

function mergeSizes(existing: ProductSize[], derived: ProductSize[]): ProductSize[] {
  const merged = new Map<string, ProductSize>();
  for (const size of [...existing, ...derived]) {
    const key = size.sizeCode.toUpperCase();
    if (!merged.has(key)) {
      merged.set(key, size);
    }
  }
  return Array.from(merged.values()).sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
}

function formatColorName(colorCode: string): string {
  // Convert codes like "VTGRED" to "Vintage Red", "HEATHER_NAVY" to "Heather Navy"
  return colorCode
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/Vtg/gi, 'Vintage')
    .replace(/Hthr/gi, 'Heather')
    .replace(/Dk/gi, 'Dark')
    .replace(/Lt/gi, 'Light');
}

