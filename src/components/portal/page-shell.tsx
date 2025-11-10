import type { ReactNode } from "react";

interface PortalPageShellProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PortalPageShell({ header, children, className }: PortalPageShellProps) {
  return (
    <div className={`page-shell ${className ?? ""}`.trim()}>
      {header}
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  overline?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function SectionHeader({ overline, title, description, actions, children }: SectionHeaderProps) {
  const hasMeta = overline || title || description;

  return (
    <div className="section-header">
      {hasMeta ? (
        <div className="stack-xs">
          {overline ? <span className="overline">{overline}</span> : null}
          {title ? <h3 className="headline">{title}</h3> : null}
          {description ? <p className="description">{description}</p> : null}
        </div>
      ) : null}
      {children}
      {actions ? <div className="cluster">{actions}</div> : null}
    </div>
  );
}

interface SectionCardProps {
  overline?: string;
  title?: string;
  description?: string;
  headerSlot?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  overline,
  title,
  description,
  actions,
  children,
  headerSlot,
  footer,
  className,
}: SectionCardProps) {
  return (
    <section className={`page-section ${className ?? ""}`.trim()}>
      {(overline || title || description || headerSlot || actions) && (
        <SectionHeader overline={overline} title={title} description={description} actions={actions}>
          {headerSlot}
        </SectionHeader>
      )}
      <div className="stack-lg">{children}</div>
      {footer ? <div className="divider" /> : null}
      {footer ?? null}
    </section>
  );
}

interface StatTileProps {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
}

export function StatTile({ label, value, helper, icon }: StatTileProps) {
  return (
    <div className="stat-tile">
      <span className="label">{label}</span>
      <div className="value cluster" style={{ gap: "var(--space-sm)" }}>
        {icon ? <span>{icon}</span> : null}
        <span>{value}</span>
      </div>
      {helper ? <span className="muted text-xs">{helper}</span> : null}
    </div>
  );
}
