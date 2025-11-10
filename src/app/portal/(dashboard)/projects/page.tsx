import { PageHeader } from "@/components/portal/page-header";
import { PortalPageShell, SectionCard } from "@/components/portal/page-shell";
import { ProjectCartView } from "@/components/projects/project-cart-view";

export default function ProjectsPage() {
  return (
    <PortalPageShell
      header={
        <PageHeader
          overline="Projects"
          title="Stage blanks before decoration"
          description="Collect SKUs, adjust size runs, then proceed to artwork and shipping."
          actions={<span className="muted text-xs">Workflow: Select product → Add to project → Decorate → Ship</span>}
        />
      }
    >
      <SectionCard overline="Cart" title="Current project">
        <ProjectCartView />
      </SectionCard>
    </PortalPageShell>
  );
}
