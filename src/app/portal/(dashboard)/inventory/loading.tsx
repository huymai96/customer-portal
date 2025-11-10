import { PageHeader } from "@/components/portal/page-header";

export default function InventoryLoading() {
  return (
    <section className="space-y-6" role="status" aria-live="polite">
      <PageHeader
        title="Product inventory"
        description="Loading inventory data..."
      />
      <div className="p-8">
        <div className="h-64 animate-pulse rounded-lg bg-slate-200" aria-hidden="true"></div>
      </div>
    </section>
  );
}

