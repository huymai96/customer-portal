import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_32px_-18px_rgba(37,99,235,0.8)] transition hover:from-blue-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60",
  ghost:
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
};

export const buttonVariants = (variant: ButtonVariant = "primary") => variantClasses[variant];

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants(variant), className)} {...props} />
  )
);

Button.displayName = "Button";
