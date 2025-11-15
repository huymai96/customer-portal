import Link from 'next/link';
import clsx from 'clsx';
import { SupplierSource } from '@prisma/client';

import type { SupplierCode } from '@/lib/types';
import { searchCanonicalStyles } from '@/services/search-service';
import CatalogResultsControls from '@/components/catalog/catalog-results-controls';

const SUPPLIER_LABELS: Record<SupplierCode, string> = {
  SANMAR: 'SanMar',
  SSACTIVEWEAR: 'S&S Activewear',
};

const SUPPLIER_SOURCE_MAP: Record<SupplierCode, SupplierSource> = {
  SANMAR: SupplierSource.SANMAR,
  SSACTIVEWEAR: SupplierSource.SSACTIVEWEAR,
};

interface CatalogSearchResultsProps {
  query: string;
  suppliers: SupplierCode[];
  sort: 'relevance' | 'supplier' | 'price' | 'stock';
  page: number;
  limit: number;
  inStockOnly?: boolean;
}

export default async function CatalogSearchResults({
  query,
  suppliers,
  sort,
  page,
  limit,
  inStockOnly = false,
}: CatalogSearchResultsProps) {
  const trimmedQuery = query.trim();
  const offset = (page - 1) * limit;
  const hasQuery = trimmedQuery.length >= 2;

  if (!hasQuery) {
    return (
      <div className="space-y-4">
        <CatalogResultsControls
          query={trimmedQuery}
          suppliers={suppliers}
          sort={sort}
          page={page}
          limit={limit}
          count={0}
          total={0}
          variant="filters"
          inStockOnly={inStockOnly}
        />
        <p className="text-sm text-slate-500">
          Enter at least two characters above to browse catalog matches from SanMar and S&amp;S Activewear.
        </p>
      </div>
    );
  }

  const supplierSources = suppliers.map((code) => SUPPLIER_SOURCE_MAP[code]);

  const { items, total } = await searchCanonicalStyles(trimmedQuery, {
    limit,
    offset,
    suppliers: supplierSources.length ? supplierSources : undefined,
    sort,
    inStockOnly,
  });

  const startIndex = total > 0 ? offset + 1 : 0;
  const endIndex = startIndex + items.length - 1;

  return (
    <div className="space-y-6">
      <CatalogResultsControls
        query={trimmedQuery}
        suppliers={suppliers}
        sort={sort}
        page={page}
        limit={limit}
        count={items.length}
        total={total}
        variant="filters"
        inStockOnly={inStockOnly}
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No matches yet. Try broadening your terms or clearing supplier filters.
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((result) => (
            <article
              key={`${result.styleNumber}-${result.primarySupplierPartId}`}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Style {result.styleNumber}
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {result.displayName}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {result.brand ?? 'Brand unavailable'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-sm text-slate-500">
                  <span>
                    Primary supplier:{' '}
                    {result.primarySupplier
                      ? SUPPLIER_LABELS[result.primarySupplier]
                      : 'Not linked'}
                  </span>
                  <Link
                    href={`/portal/catalog/${encodeURIComponent(result.primarySupplierPartId)}`}
                    className="inline-flex items-center justify-center rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    View product
                  </Link>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                {result.price?.min ? (
                  <span>
                    From {formatCurrency(result.price.min, result.price.currency)}
                    {result.price?.max && result.price.max !== result.price.min
                      ? ` – ${formatCurrency(result.price.max, result.price.currency)}`
                      : ''}
                  </span>
                ) : null}
                {result.availability ? (
                  <span>
                    {result.availability.suppliersInStock}/{result.availability.totalSuppliers} suppliers in stock
                  </span>
                ) : null}
                {result.primarySupplier != null ? (
                  <span
                    className={clsx(
                      'font-medium',
                      result.primarySupplierInStock ? 'text-emerald-600' : 'text-slate-500'
                    )}
                  >
                    {result.primarySupplierInStock ? 'Preferred supplier ready' : 'Preferred supplier backordered'}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.suppliers.map((supplier) => (
                  <div
                    key={`${result.styleNumber}-${supplier.supplierPartId}`}
                    className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {SUPPLIER_LABELS[supplier.supplier]} · {supplier.supplierPartId}
                        </p>
                        <p className="text-xs text-slate-500">
                          {supplier.brand ?? 'Brand unavailable'}
                        </p>
                      </div>
                      <Link
                        href={`/portal/catalog/${encodeURIComponent(supplier.supplierPartId)}`}
                        className="text-xs font-semibold text-brand-600 underline-offset-2 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <CatalogResultsControls
          query={trimmedQuery}
          suppliers={suppliers}
          sort={sort}
          page={page}
          limit={limit}
          count={items.length}
          total={total}
          variant="pager"
          range={{ start: startIndex, end: endIndex }}
          inStockOnly={inStockOnly}
        />
      ) : null}
    </div>
  );
}

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

