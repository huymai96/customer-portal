import { redirect } from 'next/navigation';
import { SupplierSource } from '@prisma/client';

import { Header } from '@/app/components/Header';
import { SearchResults } from '@/app/components/SearchResults';
import { findExactCanonicalStyleMatch } from '@/services/search-service';

type SearchScope = 'ALL' | 'SANMAR' | 'SSACTIVEWEAR';

interface SearchPageProps {
  searchParams?: Promise<{
    query?: string;
    scope?: string;
  }>;
}

function normalizeScope(value?: string): SearchScope {
  if (value === 'SANMAR' || value === 'SSACTIVEWEAR') {
    return value;
  }
  return 'ALL';
}

function scopeToSuppliers(scope: SearchScope): SupplierSource[] | undefined {
  if (scope === 'SANMAR' || scope === 'SSACTIVEWEAR') {
    return [scope];
  }
  return undefined;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawQuery = typeof resolvedParams?.query === 'string' ? resolvedParams.query : '';
  const query = rawQuery.trim();
  const scope = normalizeScope(resolvedParams?.scope);

  if (query) {
    const suppliers = scopeToSuppliers(scope);
    const directMatch = await findExactCanonicalStyleMatch(query, suppliers);
    if (directMatch?.canonicalStyleId) {
      redirect(`/product/${directMatch.canonicalStyleId}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <SearchResults query={query} scope={scope} />
      </main>
    </div>
  );
}
