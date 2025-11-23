import type { InventoryWarehouseEntry } from '@/services/product-service';
import { getWarehouseDisplayName } from './warehouse-names';

export interface WarehouseRow {
  warehouseId: string;
  warehouseName: string | null;
  displayName: string;
  sizeCells: Map<string, number>;
  totalQty: number;
}

export interface InventoryMatrixData {
  warehouses: WarehouseRow[];
  sizes: string[];
  totalsBySizeCode: Map<string, number>;
  grandTotal: number;
}

// Size order: XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL, 6XL (note: XXS is rare, included for completeness)
// This order is enforced everywhere sizes are displayed
const SIZE_DISPLAY_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

export function buildInventoryMatrix(
  inventoryRows: Array<{
    warehouseId: string;
    warehouseName?: string | null;
    sizeCode: string;
    quantity: number;
  }>,
  sizeOrder: string[],
  supplier?: string,
  allWarehouses?: Array<{ warehouseId: string; warehouseName?: string | null }>
): InventoryMatrixData {
  // Use displayName as the key to prevent duplicates (e.g., "CIN" and "2" both map to "Cincinnati, OH")
  const warehouseMapByDisplayName = new Map<string, WarehouseRow>();
  const warehouseIdToDisplayName = new Map<string, string>();
  const totalsBySizeCode = new Map<string, number>();
  let grandTotal = 0;

  // First, process all inventory rows to build the data
  for (const row of inventoryRows) {
    const displayName = getWarehouseDisplayName(row.warehouseId, row.warehouseName, supplier);
    warehouseIdToDisplayName.set(row.warehouseId, displayName);

    // Use displayName as key to merge warehouses with same display name but different IDs
    if (!warehouseMapByDisplayName.has(displayName)) {
      warehouseMapByDisplayName.set(displayName, {
        warehouseId: row.warehouseId, // Keep first warehouseId encountered
        warehouseName: row.warehouseName ?? null,
        displayName,
        sizeCells: new Map(),
        totalQty: 0,
      });
    }

    const warehouse = warehouseMapByDisplayName.get(displayName)!;
    warehouse.sizeCells.set(row.sizeCode, (warehouse.sizeCells.get(row.sizeCode) ?? 0) + row.quantity);
    warehouse.totalQty += row.quantity;

    const currentSizeTotal = totalsBySizeCode.get(row.sizeCode) ?? 0;
    totalsBySizeCode.set(row.sizeCode, currentSizeTotal + row.quantity);
    grandTotal += row.quantity;
  }

  // Then, ensure ALL warehouses from the directory are included (even with zero quantities)
  if (allWarehouses) {
    for (const wh of allWarehouses) {
      const displayName = getWarehouseDisplayName(wh.warehouseId, wh.warehouseName, supplier);
      
      // Only add if we don't already have a warehouse with this display name
      if (!warehouseMapByDisplayName.has(displayName)) {
        warehouseMapByDisplayName.set(displayName, {
          warehouseId: wh.warehouseId,
          warehouseName: wh.warehouseName ?? null,
          displayName,
          sizeCells: new Map(),
          totalQty: 0,
        });
      }
    }
  }

  const warehouses = Array.from(warehouseMapByDisplayName.values()).sort((a, b) => {
    // Sort by display name for better readability
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    warehouses,
    sizes: sortSizeCodes(sizeOrder.length ? sizeOrder : Array.from(totalsBySizeCode.keys())),
    totalsBySizeCode,
    grandTotal,
  };
}

export function flattenInventoryRows(
  rows: Array<{
    colorCode: string;
    sizeCode: string;
    totalQty: number;
    warehouses?: InventoryWarehouseEntry[];
  }>,
  warehouseDirectory: InventoryWarehouseEntry[] = []
) {
  const directoryMap = new Map<string, InventoryWarehouseEntry>();
  for (const entry of warehouseDirectory) {
    directoryMap.set(entry.warehouseId, entry);
  }

  const flattened: Array<{
    warehouseId: string;
    warehouseName?: string | null;
    sizeCode: string;
    quantity: number;
  }> = [];

  for (const row of rows) {
    if (!row.warehouses?.length) {
      continue;
    }
    for (const warehouse of row.warehouses) {
      const directoryEntry = directoryMap.get(warehouse.warehouseId);
      flattened.push({
        warehouseId: warehouse.warehouseId,
        warehouseName: warehouse.warehouseName ?? directoryEntry?.warehouseName ?? null,
        sizeCode: row.sizeCode,
        quantity: warehouse.quantity,
      });
    }
  }

  return flattened;
}

export function extractSizesFromInventory(
  productSizes: string[] = [],
  inventoryRows: Array<{ sizeCode: string }> = []
): string[] {
  const codes = new Set<string>();
  productSizes.forEach((code) => codes.add(code));
  inventoryRows.forEach((row) => codes.add(row.sizeCode));
  return sortSizeCodes(Array.from(codes));
}

export function sortSizeCodes(sizeCodes: string[]): string[] {
  const priority = new Map<string, number>();
  SIZE_DISPLAY_ORDER.forEach((code, index) => priority.set(code.toUpperCase(), index));

  return Array.from(new Set(sizeCodes)).sort((a, b) => {
    const aPriority = priority.get(a.toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priority.get(b.toUpperCase()) ?? Number.MAX_SAFE_INTEGER;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
}

