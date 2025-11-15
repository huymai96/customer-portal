'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { findExactProductMatch, searchCatalogProducts } from '@/lib/search';

import { POPULAR_CATEGORIES, RECENT_SEARCHES } from './site-data';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const suggestions = useMemo(() => searchCatalogProducts(query.trim(), 5), [query]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setIsOpen(false);
      return;
    }

    const exactMatch = findExactProductMatch(trimmed);
    if (exactMatch) {
      router.push(`/product/${encodeURIComponent(exactMatch.styleCode)}`);
    } else {
      router.push(`/search?query=${encodeURIComponent(trimmed)}`);
    }
    setIsOpen(false);
  };

  const handleSuggestionSelect = (styleCode: string) => {
    router.push(`/product/${encodeURIComponent(styleCode)}`);
    setIsOpen(false);
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      <form
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200"
        onSubmit={handleSubmit}
      >
        <input
          className="h-10 flex-1 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          placeholder="Search products, styles or brands…"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
        />
        <button
          type="submit"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          aria-label="Search catalog"
        >
          <SearchIcon />
        </button>
      </form>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="grid gap-6 p-5 md:grid-cols-[2fr,1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Matching products
              </p>
              <ul className="mt-2 divide-y divide-slate-100 text-sm text-slate-700">
                {suggestions.length ? (
                  suggestions.map((hit) => (
                    <li key={hit.product.styleCode} className="py-2">
                      <button
                        type="button"
                        className="w-full text-left"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSuggestionSelect(hit.product.styleCode)}
                      >
                        <span className="font-semibold text-slate-900">
                          {hit.product.brand} • {hit.product.name}
                        </span>
                        <span className="ml-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                          {hit.product.styleCode}
                        </span>
                        <p className="text-xs text-slate-400">{hit.reason}</p>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="py-2 text-xs text-slate-400">No matches yet</li>
                )}
              </ul>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Recent searches
                </p>
                <ul className="mt-2 space-y-1">
                  {RECENT_SEARCHES.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        className="text-left text-slate-600 hover:text-slate-900"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setQuery(item)}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Popular categories
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {POPULAR_CATEGORIES.map((category) => (
                    <Link
                      key={category}
                      href={`/category/${slugify(category)}`}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-brand-500 hover:text-brand-600"
                      onClick={() => setIsOpen(false)}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-4.35-4.35m0-6.3A6.3 6.3 0 1110.35 4.05a6.3 6.3 0 016.3 6.3z"
      />
    </svg>
  );
}
