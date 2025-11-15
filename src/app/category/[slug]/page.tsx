import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Header } from '@/app/components/Header';
import { ProductCard } from '@/app/components/ProductCard';
import {
  CATEGORY_TILES,
  SAMPLE_PRODUCTS,
  type CategoryTile,
} from '@/app/components/site-data';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

function resolveCategory(slug: string): CategoryTile | undefined {
  const normalized = slug.toLowerCase();
  return CATEGORY_TILES.find((tile) => tile.slug === normalized);
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = resolveCategory(slug);
  const title = category?.name ?? titleCase(slug);

  const products = SAMPLE_PRODUCTS.filter((product) => product.category === slug);
  const fallbackProducts = products.length ? products : SAMPLE_PRODUCTS.slice(0, 4);

  if (!title) {
    notFound();
  }

  const brands = Array.from(new Set(SAMPLE_PRODUCTS.map((product) => product.brand))).sort();
  const colors = Array.from(new Set(SAMPLE_PRODUCTS.map((product) => product.color))).sort();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-10">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Category</p>
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{category?.description ?? DEFAULT_CATEGORY_DESCRIPTION}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Refine assortment
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <FilterSelect label="Brand" options={brands} />
            <FilterSelect label="Color" options={colors} />
            <FilterSelect label="Price" options={['$0 - $10', '$10 - $25', '$25+']} />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {fallbackProducts.length} curated styles for {title}.
            </p>
            <Link className="text-sm font-semibold text-brand-600 underline-offset-2 hover:underline" href="/">
              back to home
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fallbackProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
      {label}
      <select className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200">
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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

