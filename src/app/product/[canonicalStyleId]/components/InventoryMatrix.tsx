'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';

import type { ColorOption, SizeOption } from './types';

interface WarehouseEntry {
  warehouseId: string;
  warehouseName?: string | null;
  quantity: number;
}

interface InventoryRow {
  colorCode: string;
  sizeCode: string;
  totalQty: number;
  warehouses?: WarehouseEntry[];
  backorderDate?: string | null;
}

interface InventoryMatrixProps {
  rows: InventoryRow[];
  sizes: SizeOption[];
  colors: ColorOption[];
  warehouses: WarehouseEntry[];
  selectedColorCode: string | null;
  colorScope: 'single' | 'all';
  warehouseFilter: string;
  viewMode: 'warehouse' | 'color';
  onColorScopeChange: (scope: 'single' | 'all') => void;
  onWarehouseFilterChange: (warehouseId: string) => void;
  onViewModeChange: (mode: 'warehouse' | 'color') => void;
}

interface CellData {
  qty: number;
  backorderDate?: string;
}

export function InventoryMatrix({
  rows,
  sizes,
  colors,
  warehouses,
  selectedColorCode,
  colorScope,
  warehouseFilter,
  viewMode,
  onColorScopeChange,
  onWarehouseFilterChange,
  onViewModeChange,
}: InventoryMatrixProps) {
  const [hovered, setHovered] = useState<{ row: number | null; col: number | null }>({
    row: null,
    col: null,
  });

  const normalizedSizes = useMemo(() => mergeSizes(sizes, rows), [rows, sizes]);
  const sizeOrder = normalizedSizes.map((size) => size.sizeCode);

  const warehouseOptions = useMemo(() => mergeWarehouses(warehouses, rows), [rows, warehouses]);
  const colorOptions = useMemo(() => mergeColors(colors, rows), [colors, rows]);

  const allColorCodes = colorOptions.map((color) => color.colorCode).filter(Boolean);
  const defaultColor = allColorCodes[0] ?? null;

  const activeColors = useMemo(() => {
    if (colorScope === 'single') {
      const desired = selectedColorCode && allColorCodes.includes(selectedColorCode) ? selectedColorCode : defaultColor;
      return desired ? [desired] : [];
    }
    return allColorCodes.length ? allColorCodes : defaultColor ? [defaultColor] : [];
  }, [allColorCodes, colorScope, defaultColor, selectedColorCode]);

  const activeWarehouses =
    warehouseFilter === 'ALL'
      ? warehouseOptions
      : warehouseOptions.filter((warehouse) => warehouse.warehouseId === warehouseFilter);

  const tableData = useMemo(() => {
    if (viewMode === 'warehouse') {
      return activeWarehouses.map((warehouse) => ({
        id: warehouse.warehouseId,
        label: warehouse.warehouseName ?? warehouse.warehouseId,
        cells: sizeOrder.map((sizeCode) =>
          aggregateWarehouseCell(rows, warehouse.warehouseId, sizeCode, activeColors)
        ),
      }));
    }

    const visibleColors =
      colorScope === 'single' && activeColors.length
        ? colorOptions.filter((color) => color.colorCode === activeColors[0])
        : colorOptions;

    return visibleColors.map((color) => ({
      id: color.colorCode,
      label: color.colorName ?? color.colorCode,
      cells: sizeOrder.map((sizeCode) =>
        aggregateColorCell(rows, color.colorCode, sizeCode, warehouseFilter)
      ),
    }));
  }, [
    activeColors,
    activeWarehouses,
    colorOptions,
    colorScope,
    rows,
    sizeOrder,
    viewMode,
    warehouseFilter,
  ]);

  const totalsRow = useMemo(() => {
    return sizeOrder.map((sizeCode) => {
      if (viewMode === 'warehouse') {
        if (warehouseFilter === 'ALL') {
          return activeWarehouses.reduce<CellData>(
            (acc, warehouse) => {
              const cell = aggregateWarehouseCell(rows, warehouse.warehouseId, sizeCode, activeColors);
              acc.qty += cell.qty;
              return acc;
            },
            { qty: 0 }
          );
        }
        return aggregateWarehouseCell(rows, warehouseFilter, sizeCode, activeColors);
      }

      if (colorScope === 'single') {
        return aggregateColorCell(rows, activeColors[0] ?? null, sizeCode, warehouseFilter);
      }
      return colorOptions.reduce<CellData>(
        (acc, color) => {
          const cell = aggregateColorCell(rows, color.colorCode, sizeCode, warehouseFilter);
          acc.qty += cell.qty;
          return acc;
        },
        { qty: 0 }
      );
    });
  }, [
    activeColors,
    activeWarehouses,
    colorOptions,
    colorScope,
    rows,
    sizeOrder,
    viewMode,
    warehouseFilter,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <span>Mode:</span>
          <button
            type="button"
            onClick={() => onColorScopeChange('single')}
            className={clsx(
              'rounded-full px-3 py-1',
              colorScope === 'single' ? 'bg-brand-600 text-white' : 'text-slate-500'
            )}
          >
            1 Color
          </button>
          <button
            type="button"
            onClick={() => onColorScopeChange('all')}
            className={clsx(
              'rounded-full px-3 py-1',
              colorScope === 'all' ? 'bg-brand-600 text-white' : 'text-slate-500'
            )}
          >
            All Colors
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          Warehouse:
          <select
            value={warehouseFilter}
            onChange={(event) => onWarehouseFilterChange(event.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none"
          >
            <option value="ALL">All Warehouses</option>
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                {warehouse.warehouseName ?? warehouse.warehouseId}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
          View:
          <select
            value={viewMode}
            onChange={(event) => onViewModeChange(event.target.value as 'warehouse' | 'color')}
            className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none"
          >
            <option value="warehouse">Warehouse View</option>
            <option value="color">Color View</option>
          </select>
        </label>
      </div>

      <div className="overflow-auto rounded-3xl border border-slate-200">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th className="sticky left-0 top-0 z-20 w-48 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left">
                {viewMode === 'warehouse' ? 'Warehouse' : 'Color'}
              </th>
              {sizeOrder.map((size, colIndex) => (
                <th
                  key={size}
                  className={clsx(
                    'sticky top-0 z-10 border-b border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-600',
                    hovered.col === colIndex ? 'bg-brand-50' : 'bg-slate-50'
                  )}
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={row.id} className="text-sm text-slate-700">
                <td
                  className={clsx(
                    'sticky left-0 z-10 border-b border-slate-200 bg-white px-4 py-3 font-semibold',
                    hovered.row === rowIndex ? 'bg-brand-50' : 'bg-white'
                  )}
                >
                  {row.label}
                </td>
                {row.cells.map((cell, colIndex) => (
                  <td
                    key={`${row.id}-${colIndex}`}
                    onMouseEnter={() => setHovered({ row: rowIndex, col: colIndex })}
                    onMouseLeave={() => setHovered({ row: null, col: null })}
                    className={clsx(
                      'border-b border-slate-100 px-4 py-3 text-center font-semibold transition',
                      cell.qty === 0
                        ? 'text-slate-300'
                        : hovered.row === rowIndex || hovered.col === colIndex
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-slate-900'
                    )}
                  >
                    <div>{cell.qty > 0 ? cell.qty.toLocaleString() : '—'}</div>
                    {cell.backorderDate ? (
                      <div className="text-[11px] font-normal text-amber-600">
                        Backorder {formatDate(cell.backorderDate)}
                      </div>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 text-sm font-semibold text-slate-700">
              <td className="sticky left-0 border-t border-slate-200 px-4 py-3">Totals</td>
              {totalsRow.map((cell, index) => (
                <td key={`total-${index}`} className="border-t border-slate-200 px-4 py-3 text-center">
                  {cell.qty.toLocaleString()}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function aggregateWarehouseCell(
  rows: InventoryRow[],
  warehouseId: string,
  sizeCode: string,
  colorFilter: string[]
): CellData {
  if (!warehouseId) {
    return { qty: 0 };
  }
  return rows.reduce<CellData>(
    (acc, row) => {
      if (!colorFilter.includes(row.colorCode) || row.sizeCode !== sizeCode) {
        return acc;
      }
      const warehouse = row.warehouses?.find((entry) => entry.warehouseId === warehouseId);
      if (!warehouse) {
        return acc;
      }
      acc.qty += warehouse.quantity;
      if (!acc.backorderDate && row.backorderDate) {
        acc.backorderDate = row.backorderDate;
      }
      return acc;
    },
    { qty: 0 }
  );
}

function aggregateColorCell(
  rows: InventoryRow[],
  colorCode: string | null,
  sizeCode: string,
  warehouseFilter: string
): CellData {
  if (!colorCode) {
    return { qty: 0 };
  }
  return rows.reduce<CellData>(
    (acc, row) => {
      if (row.colorCode !== colorCode || row.sizeCode !== sizeCode) {
        return acc;
      }
      if (warehouseFilter === 'ALL') {
        const qty =
          row.warehouses?.reduce((sum, warehouse) => sum + warehouse.quantity, 0) ?? row.totalQty;
        acc.qty += qty;
      } else {
        const warehouseQty = row.warehouses?.find(
          (warehouse) => warehouse.warehouseId === warehouseFilter
        )?.quantity;
        acc.qty += warehouseQty ?? 0;
      }
      if (!acc.backorderDate && row.backorderDate) {
        acc.backorderDate = row.backorderDate;
      }
      return acc;
    },
    { qty: 0 }
  );
}

function mergeSizes(sizes: SizeOption[], rows: InventoryRow[]): SizeOption[] {
  const map = new Map<string, SizeOption>();
  sizes?.forEach((size) => map.set(size.sizeCode, size));
  rows.forEach((row) => {
    if (!map.has(row.sizeCode)) {
      map.set(row.sizeCode, { sizeCode: row.sizeCode, display: row.sizeCode });
    }
  });
  return Array.from(map.values()).sort(sortSizes);
}

function mergeColors(colors: ColorOption[], rows: InventoryRow[]): ColorOption[] {
  const map = new Map<string, ColorOption>();
  colors?.forEach((color) => map.set(color.colorCode, color));
  rows.forEach((row) => {
    if (!map.has(row.colorCode)) {
      map.set(row.colorCode, {
        colorCode: row.colorCode,
        colorName: humanizeCode(row.colorCode),
      });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.colorName ?? a.colorCode).localeCompare(b.colorName ?? b.colorCode)
  );
}

function mergeWarehouses(warehouses: WarehouseEntry[], rows: InventoryRow[]): WarehouseEntry[] {
  const map = new Map<string, WarehouseEntry>();
  warehouses.forEach((warehouse) => map.set(warehouse.warehouseId, warehouse));
  rows.forEach((row) =>
    row.warehouses?.forEach((entry) => {
      if (!map.has(entry.warehouseId)) {
        map.set(entry.warehouseId, entry);
      }
    })
  );
  return Array.from(map.values());
}

function sortSizes(a: SizeOption, b: SizeOption) {
  const aSort = a.sort ?? Number.MAX_SAFE_INTEGER;
  const bSort = b.sort ?? Number.MAX_SAFE_INTEGER;
  if (aSort === bSort) {
    return a.sizeCode.localeCompare(b.sizeCode);
  }
  return aSort - bSort;
}

function humanizeCode(value: string) {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}


