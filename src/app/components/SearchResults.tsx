'use client';

import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { POPULAR_CATEGORIES } from './site-data';

type SupplierCode = 'SANMAR' | 'SSACTIVEWEAR';

const SUPPLIER_LABELS: Record<SupplierCode, string> = {
  SANMAR: 'SanMar',
  SSACTIVEWEAR: 'S&S Activewear',
};

interface SupplierEntry {
  supplier: string;
  supplierPartId: string;
  brand?: string | null;
}

interface ColorPreview {
  colorCode: string;
  colorName: string | null;
  swatchUrl?: string | null;
}

interface CanonicalSearchItem {
  canonicalStyleId: string | null;
  styleNumber: string;
  displayName: string;
  brand?: string | null;
  suppliers: SupplierEntry[];
  colors?: ColorPreview[];
}

interface SearchMeta {
  limit: number;
  offset: number;
  count: number;
  total: number;
  directHit: boolean;
}

interface SearchApiResponse {
  items: CanonicalSearchItem[];
  meta: SearchMeta;
}

type SearchScope = 'ALL' | SupplierCode;

interface SearchResultsProps {
  query: string;
  scope: SearchScope;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error' | 'redirecting';

export function SearchResults({ query, scope }: SearchResultsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [items, setItems] = useState<CanonicalSearchItem[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  useEffect(() => {
    if (!hasQuery) {
      return;
    }

    const controller = new AbortController();
    startTransition(() => {
      setStatus('loading');
      setError(null);
    });

    const params = new URLSearchParams({ query: trimmedQuery });
    if (scope === 'SANMAR' || scope === 'SSACTIVEWEAR') {
      params.append('supplier', scope);
    }

    fetch(`/api/products/search?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Search failed (${response.status})`);
        }
        return (await response.json()) as SearchApiResponse;
      })
      .then((payload) => {
        if (
          payload.meta?.directHit &&
          payload.items?.length === 1 &&
          payload.items[0]?.canonicalStyleId
        ) {
          startTransition(() => {
            setStatus('redirecting');
          });
          router.replace(`/product/${payload.items[0].canonicalStyleId}`);
          return;
        }
        startTransition(() => {
          setItems(payload.items ?? []);
          setMeta(payload.meta ?? null);
          setStatus('success');
        });
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Search fetch failed', fetchError);
        startTransition(() => {
          setStatus('error');
          setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        });
      });

    return () => controller.abort();
  }, [hasQuery, router, scope, trimmedQuery]);

  const scopeLabel = scope === 'SANMAR' ? 'SanMar' : scope === 'SSACTIVEWEAR' ? 'S&S Activewear' : null;

  const content = useMemo(() => {
    if (!hasQuery) {
      return (
        <EmptyState
          title="Start searching the catalog"
          description="Try searching for a style code (e.g., 5000, PC43, A230) or a brand + style."
          scopeLabel={scopeLabel}
        />
      );
    }

    if (status === 'loading') {
      return <SkeletonState query={trimmedQuery} />;
    }

    if (status === 'redirecting') {
      return (
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">
            Direct match found
          </p>
          <p className="text-sm text-slate-500">Taking you to the product page…</p>
        </section>
      );
    }

    if (status === 'error') {
      return (
        <section className="space-y-3 rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">Search error</p>
          <p className="text-sm text-slate-500">{error ?? 'Something went wrong while searching.'}</p>
        </section>
      );
    }

    if (items.length === 0) {
      return (
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">No products found</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              We couldn&apos;t find “{trimmedQuery.toUpperCase()}”
            </h2>
            <p className="text-sm text-slate-500">
              Double-check the style code or try searching by brand, product type, or keyword.
            </p>
          </div>
          <DidYouMean suggestion={trimmedQuery.toUpperCase()} />
          <SuggestionList />
        </section>
      );
    }

    return (
      <section className="space-y-6">
        {scopeLabel && (
          <div className="rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
            <span className="font-semibold text-blue-900">Searching {scopeLabel} only</span>
            <span className="text-blue-700"> • </span>
            <Link href="/search" className="text-blue-700 underline">
              Search all suppliers
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Results</p>
          <span className="text-sm text-slate-500">
            {meta?.total ?? items.length} style{(meta?.total ?? items.length) === 1 ? '' : 's'} that match &ldquo;
            {trimmedQuery.toUpperCase()}&rdquo;
          </span>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <SearchCard
              key={item.canonicalStyleId ?? item.styleNumber}
              item={item}
              query={trimmedQuery}
              highlightExact={item.styleNumber.toUpperCase() === trimmedQuery.toUpperCase()}
              showDirectBadge={Boolean(meta?.directHit && index === 0)}
            />
          ))}
        </div>
      </section>
    );
  }, [error, hasQuery, items, meta, status, trimmedQuery, scopeLabel]);

  return content;
}

function SearchCard({
  item,
  query,
  highlightExact,
  showDirectBadge,
}: {
  item: CanonicalSearchItem;
  query: string;
  highlightExact: boolean;
  showDirectBadge: boolean;
}) {
  const badgeText = showDirectBadge ? 'Direct hit' : highlightExact ? 'Exact style match' : null;
  const supplierCount = item.suppliers.length;

  return (
    <article className="grid gap-6 rounded-4xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:ring-brand-100 lg:grid-cols-[180px,1fr,auto]">
      <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand-100 via-white to-slate-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black uppercase text-brand-200">
            {(item.brand ?? item.displayName).slice(0, 2)}
          </span>
        </div>
        {badgeText ? (
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 shadow">
            {badgeText}
          </span>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{item.brand ?? 'Multi-brand'}</p>
          <h3 className="text-2xl font-semibold text-slate-900">
            {highlightMatch(item.displayName, query)}
          </h3>
          <p className="text-sm text-slate-500">
            Style&nbsp;{highlightMatch(item.styleNumber, query)} • {supplierCount} supplier
            {supplierCount === 1 ? '' : 's'}
          </p>
        </div>

        {item.colors && item.colors.length > 0 && (
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-600">Colors:</p>
            <div className="flex gap-1.5 overflow-x-auto">
              {item.colors.slice(0, 12).map((color) => (
                <div
                  key={color.colorCode}
                  className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200"
                  style={{
                    backgroundImage: color.swatchUrl ? `url(${color.swatchUrl})` : undefined,
                    backgroundColor: color.swatchUrl ? undefined : getColorHex(color.colorCode, color.colorName),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  title={`${color.colorName ?? color.colorCode}`}
                />
              ))}
              {item.colors.length > 12 && (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  +{item.colors.length - 12}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          <span className="rounded-full bg-slate-100 px-3 py-1">Core apparel</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">Ready to decorate</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {item.suppliers.map((supplier) => (
            <div
              key={`${item.styleNumber}-${supplier.supplier}-${supplier.supplierPartId}`}
              className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {SUPPLIER_LABELS[supplier.supplier as SupplierCode] ?? supplier.supplier}
              </p>
              <p className="text-base font-semibold text-slate-900">{supplier.supplierPartId}</p>
              <p className="text-xs text-slate-500">{supplier.brand ?? 'Supplier listing'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-4">
        <Link
          href={`/product/${encodeURIComponent(item.canonicalStyleId ?? item.styleNumber)}`}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          View product
          <ArrowIcon />
        </Link>
        <div className="text-xs text-slate-400">
          Updated daily • Inventory via SanMar &amp; S&S APIs
        </div>
      </div>
    </article>
  );
}

function SkeletonState({ query }: { query: string }) {
  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm text-slate-500">Searching for “{query.toUpperCase()}” …</p>
      <div className="space-y-3">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200" />
      </div>
    </section>
  );
}

function DidYouMean({ suggestion }: { suggestion: string }) {
  const href = `/search?query=${encodeURIComponent(suggestion)}`;
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      Did you mean{' '}
      <Link href={href} className="font-semibold text-brand-600">
        {suggestion}
      </Link>
      ?
    </div>
  );
}

function SuggestionList() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Try these categories
      </p>
      <div className="flex flex-wrap gap-3">
        {POPULAR_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/category/${slugify(category)}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
          >
            {category}
          </Link>
        ))}
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'ig');
  const parts = text.split(regex);
  const normalized = query.toLowerCase();
  return parts.map((part, index) =>
    part.toLowerCase() === normalized ? (
      <mark key={`${part}-${index}`} className="rounded px-1 py-0.5 bg-brand-100 text-brand-700">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function EmptyState({ title, description, scopeLabel }: { title: string; description: string; scopeLabel?: string | null }) {
  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      {scopeLabel && (
        <div className="mb-4 rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <span className="font-semibold text-blue-900">Browsing {scopeLabel}</span>
          <span className="text-blue-700"> • </span>
          <Link href="/search" className="text-blue-700 underline">
            Browse all suppliers
          </Link>
        </div>
      )}
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Search catalog</p>
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{description}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-4">
        {POPULAR_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/category/${slugify(category)}`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-600"
          >
            {category}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

// Color mapping for swatches (simplified version)
const BASIC_COLORS: Record<string, string> = {
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  NAVY: '#1E293B',
  RED: '#DC2626',
  ROYAL: '#2563EB',
  BLUE: '#2563EB',
  GREEN: '#16A34A',
  PINK: '#F472B6',
  GREY: '#94A3B8',
  GRAY: '#94A3B8',
  YELLOW: '#FCD34D',
  ORANGE: '#F97316',
  PURPLE: '#9333EA',
  BROWN: '#92400E',
  AQUATIC_BLUE: '#0EA5E9',
  ASH: '#94A3B8',
  CHARCOAL: '#374151',
  GOLD: '#FCD34D',
  KELLY: '#16A34A',
  KELLY_GREEN: '#16A34A',
  LAVENDER: '#C084FC',
  SAPPHIRE: '#1E40AF',
  SILVER: '#9CA3AF',
  VIOLET: '#7C3AED',
  HEATHER: '#94A3B8',
  MAROON: '#991B1B',
  BURGUNDY: '#991B1B',
  TEAL: '#14B8A6',
  LIME: '#84CC16',
  CORAL: '#FB7185',
};

function getColorHex(colorCode: string, colorName?: string | null): string {
  const normalizedCode = colorCode.toUpperCase().replace(/[_\s-]/g, '_');
  const normalizedName = colorName?.toUpperCase().replace(/[_\s-]/g, '_') ?? '';
  
  if (BASIC_COLORS[normalizedCode]) return BASIC_COLORS[normalizedCode];
  if (normalizedName && BASIC_COLORS[normalizedName]) return BASIC_COLORS[normalizedName];
  
  // Check for partial matches
  for (const [key, value] of Object.entries(BASIC_COLORS)) {
    if (normalizedCode.includes(key) || normalizedName.includes(key)) {
      return value;
    }
  }
  
  return '#CBD5E1'; // Default slate color
}


