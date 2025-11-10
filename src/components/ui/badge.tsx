import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600",
  outline:
    "inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <span className={cn(variantClasses[variant], className)} {...props} />;
}
