import Link from "next/link";

import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell, SectionCard } from "@/components/portal/page-shell";

export default function ProjectDecorationPage() {
  return (
    <PortalPageShell
      header={
        <PageHeader
          overline="Decoration"
          title="Add artwork & production details"
          description="Upload art files, select decoration methods, and outline shipping before submitting to production."
        />
      }
    >
      <SectionCard
        overline="Coming soon"
        title="Decoration workflow in progress"
        description="We are wiring in artwork intake, method selection, and logistics next."
      >
        <p className="muted text-sm">
          Your staged project is saved locally. Return to the <Link href="/portal/projects" className="underline">project workspace</Link> to adjust size runs or continue exploring the catalog.
        </p>
      </SectionCard>
    </PortalPageShell>
  );
}
