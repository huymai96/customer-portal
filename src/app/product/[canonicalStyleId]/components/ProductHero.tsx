'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { ProductMedia } from '@prisma/client';

interface ProductHeroProps {
  productName: string;
  brand?: string | null;
  media?: ProductMedia[];
  selectedColorCode?: string;
}

export function ProductHero({ productName, brand, media = [], selectedColorCode }: ProductHeroProps) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const prevImageUrlRef = useRef<string | undefined>(undefined);

  const images = useMemo(() => {
    // First, filter out invalid/placeholder URLs to get valid media
    const validMedia = media.filter(
      (item) => item.url && item.url.trim().length > 0 && !item.url.includes('placeholder')
    );

    // If no valid media exists at all, return empty (will show gradient)
    if (!validMedia.length) {
      return [];
    }

    const normalizedColor = selectedColorCode?.toUpperCase().trim();
    
    // Priority 1: Exact color match
    const exactMatches = normalizedColor && normalizedColor.length
      ? validMedia.filter((item) => item.colorCode?.toUpperCase().trim() === normalizedColor)
      : [];
    
    // Priority 2: StartsWith match (e.g., "HEATHER_NAVY" starts with "HEATHER")
    const startsWithMatches: typeof validMedia = exactMatches.length === 0 && normalizedColor
      ? validMedia.filter((item) => {
          const itemColor = item.colorCode?.toUpperCase().trim() ?? '';
          return itemColor.startsWith(normalizedColor) || normalizedColor.startsWith(itemColor);
        })
      : [];
    
    // Priority 3: Contains tokens (e.g., "DARK_HEATHER_NAVY" contains "NAVY")
    const tokenMatches: typeof validMedia = exactMatches.length === 0 && startsWithMatches.length === 0 && normalizedColor
      ? (() => {
          const baseColor = normalizedColor.replace(/^(HEATHER|DARK|LIGHT|VTG|VINTAGE|ATHL|SPORT)_/i, '').replace(/_/g, '');
          if (baseColor && baseColor !== normalizedColor) {
            return validMedia.filter((item) => {
              const itemColor = item.colorCode?.toUpperCase().trim() ?? '';
              return itemColor.includes(baseColor) || baseColor.includes(itemColor);
            });
          }
          return [];
        })()
      : [];
    
    // Priority 4: Fallback to OTHER color media (any media with a colorCode, even if different color)
    // This ensures we show a real product image from the supplier, not a gradient
    // Only use this fallback if we have a selected color but no matches
    const hasSelectedColor = normalizedColor && normalizedColor.length > 0;
    const noColorMatches = exactMatches.length === 0 && startsWithMatches.length === 0 && tokenMatches.length === 0;
    const otherColorMedia = hasSelectedColor && noColorMatches
      ? validMedia.filter((item) => item.colorCode && item.colorCode.trim().length > 0)
      : [];
    
    // Priority 5: If no color selected, or all color matches failed, use any media with colorCode
    const anyColorMedia = otherColorMedia.length === 0
      ? validMedia.filter((item) => item.colorCode && item.colorCode.trim().length > 0)
      : [];
    
    // Priority 6: Fallback to any remaining valid media (including global/non-color-specific)
    const source = exactMatches.length > 0 
      ? exactMatches 
      : startsWithMatches.length > 0 
      ? startsWithMatches 
      : tokenMatches.length > 0 
      ? tokenMatches 
      : otherColorMedia.length > 0
      ? otherColorMedia
      : anyColorMedia.length > 0
      ? anyColorMedia
      : validMedia; // Last resort: any valid media

    // Sort and prioritize, filtering out known failed URLs
    return source
      .filter((item) => !failedUrls.has(item.url)) // Skip URLs that have failed to load
      .sort((a, b) => {
        // Prefer main images over thumbnails
        const aIsThumb = a.url.toLowerCase().includes('thumb');
        const bIsThumb = b.url.toLowerCase().includes('thumb');
        if (aIsThumb && !bIsThumb) return 1;
        if (!aIsThumb && bIsThumb) return -1;
        // Prefer images with exact color match
        if (normalizedColor) {
          const aExact = a.colorCode?.toUpperCase().trim() === normalizedColor;
          const bExact = b.colorCode?.toUpperCase().trim() === normalizedColor;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
        }
        // Prefer images with color codes over global images
        if (a.colorCode && !b.colorCode) return -1;
        if (!a.colorCode && b.colorCode) return 1;
        return 0;
      })
      .map((item) => ({
        id: `${item.colorCode ?? 'GLOBAL'}-${item.url}`,
        url: item.url,
        colorCode: item.colorCode ?? null,
      }));
  }, [media, selectedColorCode, failedUrls]);

  const placeholderLabel = brand ?? productName;
  // Get the first image that hasn't failed
  const primaryImage = images.find((img) => !failedUrls.has(img.url)) || images[0];
  const currentImageUrl = primaryImage?.url;
  // Only show placeholder if there's no valid image at all
  const showPlaceholder = !primaryImage || images.length === 0;

  // Reset failed URLs when media changes (new supplier selected, etc.)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setFailedUrls(new Set());
    prevImageUrlRef.current = undefined;
  }, [media]);

  // Handle image load error - try next image if available
  const handleImageError = () => {
    if (primaryImage?.url) {
      setFailedUrls((prev) => {
        const updated = new Set(prev);
        updated.add(primaryImage.url);
        return updated;
      });
    }
    // The images array will automatically update to skip failed URLs due to the filter
    // If all images fail, showPlaceholder will become true
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-square w-full bg-slate-50">
        {showPlaceholder ? (
          <PlaceholderPanel label={placeholderLabel} />
        ) : primaryImage ? (
          <div className="relative h-full w-full">
            <Image
              src={primaryImage.url}
              alt={`${productName}${primaryImage.colorCode ? ` - ${primaryImage.colorCode}` : ''}`}
              fill
              className="object-contain"
              onError={handleImageError}
              unoptimized
            />
          </div>
        ) : (
          <PlaceholderPanel label={placeholderLabel} />
        )}
      </div>
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  const { gradientStart, gradientEnd, initial } = useMemo(() => derivePlaceholder(label), [label]);

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 text-white"
      style={{ backgroundImage: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-5xl font-semibold">
        {initial}
      </div>
      <p className="px-6 text-center text-xs font-medium uppercase tracking-[0.3em] opacity-80">
        Product Image
      </p>
    </div>
  );
}

function derivePlaceholder(seed: string) {
  const normalized = seed.trim() || 'Product';
  const hash = Array.from(normalized).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradientStart = COLOR_PALETTE[hash % COLOR_PALETTE.length];
  const gradientEnd = COLOR_PALETTE[(hash + 3) % COLOR_PALETTE.length];

  return {
    gradientStart,
    gradientEnd,
    initial: normalized[0]?.toUpperCase() ?? 'P',
  };
}

const COLOR_PALETTE = ['#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#F59E0B'];


