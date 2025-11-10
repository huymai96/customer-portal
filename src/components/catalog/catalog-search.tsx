'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchProducts } from '@/lib/api';

interface Suggestion {
  supplierPartId: string;
  name: string;
  brand: string;
}

export default function CatalogSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsSearching(true);
      try {
        const result = await searchProducts(query.trim());
        if (!cancelled) {
          setSuggestions(result.items);
        }
      } catch (error) {
        console.error('Search failed', error);
        if (!cancelled) {
          setSuggestions([]);
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
  }, [query]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/portal/catalog/${encodeURIComponent(query.trim().toUpperCase())}`);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <label className="sr-only" htmlFor="catalog-search">
            Search SanMar styles or names
          </label>
          <input
            id="catalog-search"
            className="w-full rounded-full border border-slate-200 bg-white px-12 py-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Search SanMar styles or names (e.g., PC54)"
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
      {suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {suggestions.map((item) => (
            <li key={item.supplierPartId}>
              <button
                type="button"
                onClick={() => router.push(`/portal/catalog/${encodeURIComponent(item.supplierPartId)}`)}
                className="flex w-full flex-col rounded-xl px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="text-sm font-semibold text-slate-900">
                  {item.brand} - {item.supplierPartId}
                </span>
                <span className="text-xs text-slate-500">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {isSearching ? (
        <p className="mt-2 text-xs text-slate-400">Searching inventory...</p>
      ) : null}
    </div>
  );
}
