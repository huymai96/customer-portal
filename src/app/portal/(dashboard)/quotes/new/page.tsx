import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell } from "@/components/portal/page-shell";
import { QuoteForm } from "@/components/quotes/quote-form";

interface NewQuotePageProps {
  searchParams?: Promise<{
    sku?: string;
    quantity?: string;
  }>;
}

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const initialSku = resolvedParams?.sku || "";
  const initialQuantity = resolvedParams?.quantity ? Number(resolvedParams.quantity) : 24;

  return (
    <PortalPageShell
      header={
        <PageHeader
          overline="Quotes"
          title="Generate quote"
          description="Fill in garment details and artwork placement. The request is signed with your portal credentials before reaching the Promos Ink pricing engine."
        />
      }
    >
      <QuoteForm initialSku={initialSku} initialQuantity={initialQuantity} />
    </PortalPageShell>
  );
}


