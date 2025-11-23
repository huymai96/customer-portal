import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Header } from '@/app/components/Header';
import {
  CATEGORY_TILES,
  type CategoryTile,
} from '@/app/components/site-data';
import { searchCanonicalStyles } from '@/services/search-service';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

function resolveCategory(slug: string): CategoryTile | undefined {
  const normalized = slug.toLowerCase();
  return CATEGORY_TILES.find((tile) => tile.slug === normalized);
}

// Map category slugs to search queries that will return relevant products
// Note: Only include SKUs that exist in canonical mapping and are ingested
const CATEGORY_QUERIES: Record<string, string> = {
  't-shirts': '5000 64000 BC3001 G500 PC43', // Removed ST350 (not in mapping)
  'polos-knits': 'A230', // Removed K500, ST650 (not in mapping)
  'fleece': 'PC78H PC90H 18500', // Verify these exist
  'hats': 'C1717 C112', // Verify these exist
  'outerwear': 'J317', // Verify this exists
  'workwear': 'CSJ60', // Verify this exists
  'bags': 'BG403', // Verify this exists
  'womens': '64000L', // Verify this exists
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = resolveCategory(slug);
  const title = category?.name ?? titleCase(slug);

  if (!title) {
    notFound();
  }

  // Get real products from the canonical search service
  const searchQuery = CATEGORY_QUERIES[slug] || '';
  const products: Awaited<ReturnType<typeof searchCanonicalStyles>>['items'] = [];

  if (searchQuery) {
    // Search each SKU individually and combine unique results
    const skus = searchQuery.split(/\s+/).filter(Boolean);
    const allResults = await Promise.all(
      skus.map(async (sku) => {
        try {
          return await searchCanonicalStyles(sku, { limit: 10 });
        } catch (error) {
          console.warn(`[category] Failed to search SKU ${sku}:`, error);
          return { items: [], total: 0 };
        }
      })
    );
    const seenIds = new Set<string>();
    const missingSkus: string[] = [];
    
    for (let i = 0; i < skus.length; i++) {
      const result = allResults[i];
      const sku = skus[i];
      
      if (result.items.length === 0) {
        missingSkus.push(sku);
        console.warn(`[category] SKU ${sku} not found in database`);
        continue;
      }
      
      for (const item of result.items) {
        if (item.canonicalStyleId && !seenIds.has(item.canonicalStyleId)) {
          seenIds.add(item.canonicalStyleId);
          products.push(item);
        }
      }
    }
    
    // Log missing SKUs for debugging
    if (missingSkus.length > 0) {
      console.warn(`[category] Missing SKUs for ${slug}:`, missingSkus);
    }
    
    // Sort by style number for consistency
    products.sort((a, b) => a.styleNumber.localeCompare(b.styleNumber));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-10">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Category</p>
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{category?.description ?? DEFAULT_CATEGORY_DESCRIPTION}</p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {products.length > 0
                ? `Showing ${products.length} curated styles for ${title}.`
                : `No products found for ${title}. Try searching the catalog.`}
            </p>
            <Link className="text-sm font-semibold text-brand-600 underline-offset-2 hover:underline" href="/search">
              Search catalog
            </Link>
          </div>
          {products.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((item) => (
                <Link
                  key={item.canonicalStyleId ?? item.styleNumber}
                  href={`/product/${item.canonicalStyleId}`}
                  className="group space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 via-white to-slate-100">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-black uppercase text-brand-200">
                        {(item.brand ?? item.displayName).slice(0, 2)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.brand ?? 'Multi-brand'}</p>
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-600">
                      {item.displayName}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Style {item.styleNumber} • {item.suppliers.length} supplier{item.suppliers.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">
                No products currently curated for this category. Use the search bar above to find specific styles.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function titleCase(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const DEFAULT_CATEGORY_DESCRIPTION =
  'Use the filters above to tailor price point, fabric, and brand for your buyers. All data is mock content for the current prototype.';

