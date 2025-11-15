'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchProducts } from '@/lib/api';
import type {
  CanonicalSearchMeta,
  CanonicalSearchResult,
  SupplierCode,
} from '@/lib/types';

type Suggestion = CanonicalSearchResult;

const SUPPLIER_LABELS: Record<SupplierCode, string> = {
  SANMAR: 'SanMar',
  SSACTIVEWEAR: 'S&S Activewear',
};

const SUPPLIER_ORDER: SupplierCode[] = ['SANMAR', 'SSACTIVEWEAR'];
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface CatalogSearchProps {
  initialQuery?: string;
  initialSuppliers?: SupplierCode[];
  initialSort?: 'relevance' | 'supplier' | 'price' | 'stock';
}

export default function CatalogSearch({
  initialQuery = '',
  initialSuppliers = [],
  initialSort = 'relevance',
}: CatalogSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<SupplierCode[]>(initialSuppliers);
  const [sort, setSort] = useState<'relevance' | 'supplier' | 'price' | 'stock'>(initialSort);
  const [meta, setMeta] = useState<CanonicalSearchMeta | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setSelectedSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setMeta(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsSearching(true);
      try {
        const result = await searchProducts(query.trim(), {
          limit: 8,
          sort,
          suppliers: selectedSuppliers.length ? selectedSuppliers : undefined,
        });
        if (!cancelled) {
          setSuggestions(result.items);
          setMeta(result.meta);
        }
      } catch (error) {
        console.error('Search failed', error);
        if (!cancelled) {
          setSuggestions([]);
          setMeta(null);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query, selectedSuppliers, sort]);

  const toggleSupplier = (supplier: SupplierCode) => {
    setSelectedSuppliers((current) =>
      current.includes(supplier) ? current.filter((item) => item !== supplier) : [...current, supplier]
    );
  };

  const clearSuppliers = () => setSelectedSuppliers([]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const params = new URLSearchParams({ query: trimmed });
    if (selectedSuppliers.length) {
      selectedSuppliers.forEach((supplier) => params.append('supplier', supplier));
    }
    if (sort === 'supplier') {
      params.set('sort', sort);
    }

    router.push(`/portal/catalog?${params.toString()}`);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <label className="sr-only" htmlFor="catalog-search">
            Search SanMar or S&S styles
          </label>
          <input
            id="catalog-search"
            className="w-full rounded-full border border-slate-200 bg-white px-12 py-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Search SanMar or S&S styles (e.g., PC54, B00060)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          type="submit"
          className={clsx(
            'rounded-full px-5 py-2 text-sm font-semibold text-white transition',
            'bg-brand-600 shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
          )}
        >
          Search
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Suppliers</span>
          {SUPPLIER_ORDER.map((supplier) => {
            const isActive = selectedSuppliers.includes(supplier);
            return (
              <button
                key={supplier}
                type="button"
                onClick={() => toggleSupplier(supplier)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-semibold transition',
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {SUPPLIER_LABELS[supplier]}
              </button>
            );
          })}
          {selectedSuppliers.length > 0 ? (
            <button
              type="button"
              onClick={clearSuppliers}
              className="text-xs font-semibold text-brand-600 underline-offset-2 hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <label htmlFor="search-sort" className="font-medium">
            Sort
          </label>
          <select
            id="search-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            <option value="relevance">Most relevant</option>
            <option value="supplier">Supplier coverage</option>
            <option value="price">Lowest price</option>
            <option value="stock">Most in stock</option>
          </select>
        </div>
      </div>
      {meta ? (
        <p className="mt-2 text-xs text-slate-500">
          Showing {meta.count} suggestion{meta.count === 1 ? '' : 's'} · {meta.total} total matches ·{' '}
          {selectedSuppliers.length > 0
            ? `Filtered by ${selectedSuppliers.map((supplier) => SUPPLIER_LABELS[supplier]).join(', ')}`
            : 'All suppliers'}
        </p>
      ) : null}
      {suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {suggestions.map((item) => (
            <li key={item.styleNumber}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/portal/catalog/${encodeURIComponent(item.primarySupplierPartId)}`)
                }
                className="flex w-full flex-col rounded-xl px-4 py-3 text-left hover:bg-slate-50"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.displayName} ({item.styleNumber})
                  </span>
                  <span className="text-xs text-slate-500">
                    {item.brand ?? 'Multi-supplier style'}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  Primary: {item.primarySupplier ? SUPPLIER_LABELS[item.primarySupplier] : 'Supplier'} ·{' '}
                  {item.primarySupplierPartId}
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-slate-400">
                  <span>
                    {item.suppliers.length} supplier{item.suppliers.length === 1 ? '' : 's'} linked
                  </span>
                  {item.price?.min ? (
                    <span className="text-slate-500">
                      From {currencyFormatter.format(item.price.min)}
                    </span>
                  ) : null}
                  {item.availability ? (
                    <span className="text-slate-500">
                      {item.availability.suppliersInStock}/{item.availability.totalSuppliers} in stock
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                  {item.suppliers.map((supplier) => (
                    <div key={`${item.styleNumber}-${supplier.supplierPartId}`} className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {SUPPLIER_LABELS[supplier.supplier]}
                      </span>
                      <span className="font-semibold text-slate-700">{supplier.brand || 'Unknown brand'}</span>
                      <span className="text-slate-500">{supplier.supplierPartId}</span>
                    </div>
                  ))}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {isSearching ? <p className="mt-2 text-xs text-slate-400">Searching suppliers...</p> : null}
    </div>
  );
}
