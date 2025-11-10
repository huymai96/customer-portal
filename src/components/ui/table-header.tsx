import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TableHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function TableHeader({ title, description, actions, className }: TableHeaderProps) {
  return (
    <div className={cn("section-heading", className)}>
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2 text-xs text-slate-500">{actions}</div> : null}
    </div>
  );
}
