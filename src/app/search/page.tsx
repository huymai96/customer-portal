import { Header } from '@/app/components/Header';
import { SearchResults } from '@/app/components/SearchResults';
import { searchCatalogProducts } from '@/lib/search';

interface SearchPageProps {
  searchParams?: Promise<{
    query?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const rawQuery = typeof resolvedParams?.query === 'string' ? resolvedParams.query : '';
  const query = rawQuery.trim();
  const results = searchCatalogProducts(query, 12);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
        <SearchResults query={query} results={results} />
      </main>
    </div>
  );
}
