import { ProjectCartProvider } from '@/components/projects/project-cart-context';
import { ProjectCartPanel } from '@/components/projects/project-cart-panel';

export default function ProjectsPage() {
  return (
    <ProjectCartProvider>
      <div className="page-shell space-y-8">
        <section className="page-section">
          <h1 className="text-3xl font-semibold text-slate-900">Project Workspace</h1>
          <p className="mt-2 text-sm text-slate-500">
            Review staged lines, adjust decoration specs, and submit quotes when you’re ready. Your selections persist while you browse the catalog.
          </p>
        </section>
        <section className="page-section">
          <ProjectCartPanel />
        </section>
      </div>
    </ProjectCartProvider>
  );
}
