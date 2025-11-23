import { redirect, notFound } from 'next/navigation';

import { getCanonicalStyleByStyleNumber } from '@/services/canonical-style';

interface CatalogProductPageProps {
  params: Promise<{
    canonicalSku: string;
  }>;
}

export default async function CatalogProductPage({ params }: CatalogProductPageProps) {
  const { canonicalSku } = await params;
  const canonical = await getCanonicalStyleByStyleNumber(canonicalSku);
  if (!canonical) {
    notFound();
  }

  redirect(`/product/${canonical.id}`);
}


