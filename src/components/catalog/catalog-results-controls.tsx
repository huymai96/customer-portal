'use client';

import clsx from 'clsx';
import { usePathname, useRouter } from 'next/navigation';

import type { SupplierCode } from '@/lib/types';

const SUPPLIER_LABELS: Record<SupplierCode, string> = {
  SANMAR: 'SanMar',
  SSACTIVEWEAR: 'S&S Activewear',
};

type SortOption = 'relevance' | 'supplier' | 'price' | 'stock';

interface CatalogResultsControlsProps {
  query: string;
  suppliers: SupplierCode[];
  sort: SortOption;
  page: number;
  limit: number;
  count: number;
  total: number;
  variant?: 'filters' | 'pager';
  range?: { start: number; end: number };
  inStockOnly?: boolean;
}

export default function CatalogResultsControls({
  query,
  suppliers,
  sort,
  page,
  limit,
  count,
  total,
  variant = 'filters',
  range,
  inStockOnly = false,
}: CatalogResultsControlsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const hasQuery = query.length >= 2;
  const startIndex = range?.start ?? (total > 0 ? (page - 1) * limit + 1 : 0);
  const endIndex = range?.end ?? (startIndex ? startIndex + count - 1 : 0);
  const hasPrev = page > 1;
  const hasNext = page * limit < total;

  const updateRoute = (updates: {
    query?: string;
    suppliers?: SupplierCode[];
    sort?: SortOption;
    page?: number;
    inStockOnly?: boolean;
  }) => {
    const nextQuery = (updates.query ?? query).trim();
    const nextSuppliers = updates.suppliers ?? suppliers;
    const nextSort = updates.sort ?? sort;
    const nextPage = updates.page ?? page;
    const nextInStock = updates.inStockOnly ?? inStockOnly;

    const params = new URLSearchParams();
    if (nextQuery) {
      params.set('query', nextQuery);
    }
    if (nextSuppliers.length) {
      nextSuppliers.forEach((supplier) => params.append('supplier', supplier));
    }
    if (nextSort !== 'relevance') {
      params.set('sort', nextSort);
    }
    if (nextInStock) {
      params.set('inStockOnly', 'true');
    }
    if (nextPage > 1) {
      params.set('page', String(nextPage));
    }

    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(url, { scroll: false });
  };

  const toggleSupplier = (supplier: SupplierCode) => {
    if (!hasQuery) return;
    const nextSuppliers = suppliers.includes(supplier)
      ? suppliers.filter((entry) => entry !== supplier)
      : [...suppliers, supplier];
    updateRoute({ suppliers: nextSuppliers, page: 1 });
  };

  const clearSuppliers = () => {
    if (!hasQuery || suppliers.length === 0) return;
    updateRoute({ suppliers: [], page: 1 });
  };

  const handleSortChange = (value: SortOption) => {
    if (!hasQuery) return;
    updateRoute({ sort: value, page: 1 });
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (!hasQuery) return;
    const nextPage = direction === 'prev' ? page - 1 : page + 1;
    updateRoute({ page: nextPage });
  };

  const summary =
    total > 0
      ? `Showing ${startIndex}-${endIndex} of ${total} matches`
      : hasQuery
        ? 'No matches yet'
        : 'Start typing to search';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Search results
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            {query ? query : 'Catalog'}
          </h2>
          <p className="text-sm text-slate-500">{summary}</p>
        </div>
        {variant === 'pager' ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!hasPrev || !hasQuery}
              onClick={() => handlePageChange('prev')}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                hasPrev && hasQuery
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'cursor-not-allowed bg-slate-50 text-slate-400'
              )}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNext || !hasQuery}
              onClick={() => handlePageChange('next')}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                hasNext && hasQuery
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'cursor-not-allowed bg-slate-50 text-slate-400'
              )}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {variant === 'filters' ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Suppliers
            </span>
            {(['SANMAR', 'SSACTIVEWEAR'] as SupplierCode[]).map((supplier) => {
              const isActive = suppliers.includes(supplier);
              return (
                <button
                  key={supplier}
                  type="button"
                  onClick={() => toggleSupplier(supplier)}
                  disabled={!hasQuery}
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-semibold transition',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    !hasQuery && 'cursor-not-allowed opacity-60'
                  )}
                >
                  {SUPPLIER_LABELS[supplier]}
                </button>
              );
            })}
            {suppliers.length > 0 ? (
              <button
                type="button"
                onClick={clearSuppliers}
                disabled={!hasQuery}
                className={clsx(
                  'text-xs font-semibold text-brand-600 underline-offset-2 hover:underline',
                  !hasQuery && 'cursor-not-allowed opacity-60'
                )}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <label htmlFor="results-sort" className="font-medium">
              Sort
            </label>
            <select
              id="results-sort"
              value={sort}
              onChange={(event) =>
                handleSortChange(event.target.value as SortOption)
              }
              disabled={!hasQuery}
              className={clsx(
                'rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200',
                !hasQuery && 'cursor-not-allowed opacity-60'
              )}
            >
              <option value="relevance">Most relevant</option>
              <option value="supplier">Supplier coverage</option>
              <option value="price">Lowest price</option>
              <option value="stock">Most in stock</option>
            </select>
            <label className="flex items-center gap-1 text-xs font-medium">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) =>
                  updateRoute({ inStockOnly: event.target.checked, page: 1 })
                }
                disabled={!hasQuery}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              In stock only
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}

