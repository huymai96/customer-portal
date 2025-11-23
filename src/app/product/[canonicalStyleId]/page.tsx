import { notFound } from 'next/navigation';

import { Header } from '@/app/components/Header';
import { getCanonicalProductDetail } from '@/services/product-service';
import { ProductDetailView } from './components/ProductDetailView';

interface ProductPageProps {
  params: Promise<{
    canonicalStyleId: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { canonicalStyleId } = await params;
  const detail = await getCanonicalProductDetail(canonicalStyleId);
  if (!detail) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <ProductDetailView detail={detail} />
    </div>
  );
}


