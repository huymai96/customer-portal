import Link from 'next/link';

import type { CategoryTile } from './site-data';

interface CategoryGridProps {
  categories: CategoryTile[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Browse by Category</p>
        <h2 className="text-2xl font-semibold text-slate-900">Merchandise-ready assortments</h2>
        <p className="text-sm text-slate-500">
          Curated groupings to help you reach buyers faster—tune the search above or jump right in.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{category.icon}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5 text-slate-300 transition group-hover:text-brand-600"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{category.name}</h3>
            <p className="text-sm text-slate-500">{category.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

