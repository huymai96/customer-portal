import type { ReactNode } from "react";

interface PageHeaderProps {
  overline?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  helper?: ReactNode;
}

export function PageHeader({ overline, title, description, actions, helper }: PageHeaderProps) {
  return (
    <header className="section-header" style={{ gap: "var(--space-sm)" }}>
      <div className="stack-xs">
        {overline ? <span className="overline">{overline}</span> : null}
        <h1 className="heading-1">{title}</h1>
        {description ? <p className="description">{description}</p> : null}
        {helper ? <div className="muted text-xs">{helper}</div> : null}
      </div>
      {actions ? <div className="cluster">{actions}</div> : null}
    </header>
  );
}

