import Image from 'next/image';
import Link from 'next/link';

import {
  BRAND_LINKS,
  CATEGORY_CARDS,
  CATEGORY_PRESETS,
  PRODUCT_LINKS,
  type CatalogLink,
} from './catalog-browse-data';

function buildQueryHref(query: string) {
  const params = new URLSearchParams({ query });
  return `/portal/catalog?${params.toString()}`;
}

function buildCategoryHref(slug: string) {
  const preset = CATEGORY_PRESETS[slug];
  const params = new URLSearchParams({
    category: slug,
    ...(preset ? { query: preset.label } : {}),
  });
  return `/portal/catalog?${params.toString()}`;
}

export function CatalogBrowse() {
  return (
    <div className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white shadow-xl">
          <Image
            src="https://cdn.sanmar.com/sys-master/root/h70/h4b/12261113630750/outerwear-hero.jpg"
            alt="Seasonal apparel hero"
            fill
            className="absolute inset-0 object-cover opacity-25"
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority
          />
          <div className="relative space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-200">
              Seasonal Spotlight
            </p>
            <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">
              Layers you&apos;ll love for every season
            </h1>
            <p className="max-w-2xl text-sm text-slate-100 lg:text-base">
              From insulated outerwear to plush fleece, curate client-ready collections in minutes.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={buildCategoryHref('fleece')}
                className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Shop Sweatshirts/Fleece
              </Link>
              <Link
                href={buildCategoryHref('outerwear')}
                className="rounded-full border border-white/50 px-6 py-2 text-sm font-semibold text-white transition hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Shop Outerwear
              </Link>
            </div>
          </div>
        </section>
        <aside className="space-y-4">
          <BrowseCard title="Browse by Product" items={PRODUCT_LINKS} useCategoryLinks />
          <BrowseCard title="Browse by Brand" items={BRAND_LINKS} />
        </aside>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
            Shop By Category
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">
            Merchandise-ready collections for every buyer
          </h2>
          <p className="text-sm text-slate-500">
            Jump straight into curated assortments that stay consistent with CompanyCasuals flow.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {CATEGORY_CARDS.map((card) => (
            <Link
              key={card.slug}
              href={buildCategoryHref(card.slug)}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <Image
                  src={card.image}
                  alt={card.title}
                  width={640}
                  height={480}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="space-y-1 p-5">
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="text-sm text-slate-500">{card.description}</p>
                <span className="inline-flex items-center text-sm font-semibold text-brand-600">
                  Shop now
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-1 h-4 w-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M13.72 4.22a.75.75 0 011.06 0l5 5a.75.75 0 010 1.06l-5 5a.75.75 0 01-1.06-1.06l3.72-3.72H5.75a.75.75 0 010-1.5h11.69l-3.72-3.72a.75.75 0 010-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function BrowseCard({
  title,
  items,
  useCategoryLinks = false,
}: {
  title: string;
  items: CatalogLink[];
  useCategoryLinks?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={
                useCategoryLinks && item.categorySlug
                  ? buildCategoryHref(item.categorySlug)
                  : buildQueryHref(item.query)
              }
              className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-slate-50"
            >
              <span>{item.label}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-slate-400"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

