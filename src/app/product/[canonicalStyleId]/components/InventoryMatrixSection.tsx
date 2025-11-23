'use client';

import { useMemo } from 'react';
import type { SupplierProductDetail } from '@/services/product-service';
import {
  buildInventoryMatrix,
  extractSizesFromInventory,
  flattenInventoryRows,
} from '@/lib/catalog/inventory-matrix';

interface InventoryMatrixSectionProps {
  supplier: SupplierProductDetail | undefined;
  selectedColorCode: string;
  allSizes: string[];
}

export function InventoryMatrixSection({
  supplier,
  selectedColorCode,
  allSizes,
}: InventoryMatrixSectionProps) {
  const normalizedColor = selectedColorCode?.trim().toUpperCase() ?? '';

  const sizeOrder = useMemo(() => {
    if (!supplier?.inventory) {
      return allSizes;
    }
    const productSizes = supplier.product?.sizes?.map((size) => size.sizeCode) ?? [];
    const derivedOrder = extractSizesFromInventory(productSizes, supplier.inventory.rows);
    return derivedOrder.length ? derivedOrder : allSizes;
  }, [supplier, allSizes]);

  const matrixData = useMemo(() => {
    if (!supplier?.inventory || !normalizedColor) {
      return null;
    }

    const colorRows = supplier.inventory.rows.filter(
      (row) => row.colorCode.toUpperCase() === normalizedColor
    );

    // Even if no rows for this color, show all warehouses with zeros
    const flattened = colorRows.length > 0 
      ? flattenInventoryRows(colorRows, supplier.inventory.warehouses)
      : [];

    // Always pass all warehouses from directory to ensure they all appear in matrix
    const allWarehouses = supplier.inventory.warehouses.map((wh) => ({
      warehouseId: wh.warehouseId,
      warehouseName: wh.warehouseName,
    }));

    // If no warehouses at all, return null
    if (!allWarehouses.length) {
      return null;
    }

    return buildInventoryMatrix(flattened, sizeOrder, supplier.supplier, allWarehouses);
  }, [supplier, normalizedColor, sizeOrder]);

  if (!supplier) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">No supplier selected.</p>
      </div>
    );
  }

  if (!selectedColorCode) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Select a color to view inventory.</p>
      </div>
    );
  }

  if (!matrixData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Inventory
        </h3>
        <p className="text-sm text-slate-600">
          Inventory not available for this color. Please contact us for delivery information.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Inventory by Warehouse
        </h3>
        <span className="text-xs text-slate-500">
          Total: {matrixData.grandTotal.toLocaleString()} pcs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Warehouse
              </th>
              {matrixData.sizes.map((sizeCode) => (
                <th
                  key={sizeCode}
                  className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
                >
                  {sizeCode}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {matrixData.warehouses.map((warehouse) => (
              <tr
                key={warehouse.warehouseId}
                className="border-b border-slate-200 transition hover:bg-slate-50"
              >
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-700">
                  {warehouse.displayName}
                </td>
                {matrixData.sizes.map((sizeCode) => {
                  const qty = warehouse.sizeCells.get(sizeCode) || 0;
                  return (
                    <td
                      key={sizeCode}
                      className={`px-3 py-2 text-center ${
                        qty > 0 ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {qty > 0 ? qty.toLocaleString() : '—'}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-semibold text-slate-700">
                  {warehouse.totalQty.toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-slate-700">Total</td>
              {matrixData.sizes.map((sizeCode) => {
                const total = matrixData.totalsBySizeCode.get(sizeCode) || 0;
                return (
                  <td key={sizeCode} className="px-3 py-2 text-center text-slate-700">
                    {total > 0 ? total.toLocaleString() : '—'}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right text-slate-700">
                {matrixData.grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
