'use client';

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Copy, Check, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteActionsProps {
  quoteId: string;
  printHref: string;
}

export function QuoteActions({ quoteId, printHref }: QuoteActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + `/portal/quotes/${quoteId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={printHref}
        target="_blank"
        className={cn(buttonVariants("secondary"), "rounded-full px-4")}
      >
        <Printer className="mr-2 h-4 w-4" /> Print
      </Link>
      <button
        type="button"
        onClick={handleCopy}
        className={cn(buttonVariants("secondary"), "rounded-full px-4")}
      >
        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />} Share link
      </button>
    </div>
  );
}
