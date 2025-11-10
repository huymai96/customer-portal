'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConvertQuoteButton({ quoteId, disabled }: { quoteId: string; disabled?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={disabled || isPending}
        className={cn(buttonVariants("primary"), "rounded-full px-5 shadow-lg")}
        onClick={() => {
          setMessage(null);
          setIsError(false);
          startTransition(async () => {
            const response = await fetch(`/api/portal/quotes/${quoteId}/convert`, {
              method: "POST",
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
              setIsError(true);
              setMessage(data.error || "Failed to convert quote");
              return;
            }
            setIsError(false);
            setMessage("Converted to order.");
            router.refresh();
          });
        }}
      >
        {isPending ? "Converting…" : disabled ? "Already converted" : "Convert to order"}
      </button>
      {message && (
        <p
          className={cn(
            "text-xs",
            isError ? "text-rose-600" : "text-slate-500"
          )}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}
