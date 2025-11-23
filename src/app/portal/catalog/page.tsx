import { redirect } from 'next/navigation';

interface CatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function resolveSingleParam(value?: string | string[]): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const resolved = await searchParams;
  const nextParams = new URLSearchParams();

  const query = resolveSingleParam(resolved.query);
  if (query) {
    nextParams.set('query', query);
  }

  const supplier = resolveSingleParam(resolved.supplier);
  if (supplier) {
    nextParams.set('scope', supplier.toUpperCase());
  }

  const target = nextParams.toString() ? `/search?${nextParams.toString()}` : '/search';
  redirect(target);
}

