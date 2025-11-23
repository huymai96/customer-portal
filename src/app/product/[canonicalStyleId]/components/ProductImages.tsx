'use client';

import Image from 'next/image';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import type { ProductMedia } from '@prisma/client';

interface ProductImagesProps {
  media?: ProductMedia[];
  productName: string;
  brand?: string | null;
  selectedColorCode?: string | null;
}

export function ProductImages({ media = [], productName, brand, selectedColorCode }: ProductImagesProps) {
  const images = useMemo(() => {
    if (!media.length) {
      return [];
    }

    const normalizedColor = selectedColorCode?.toUpperCase();
    const colorMatches =
      normalizedColor && normalizedColor.length
        ? media.filter((item) => item.colorCode?.toUpperCase() === normalizedColor)
        : [];
    const source = colorMatches.length ? colorMatches : media;

    return source.map((item) => ({
      id: `${item.colorCode ?? 'GLOBAL'}-${item.url}`,
      url: item.url,
      colorCode: item.colorCode ?? null,
    }));
  }, [media, selectedColorCode]);

  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  const activeImage = images.find((image) => image.id === activeImageId) ?? images[0] ?? null;
  const showPlaceholder = !activeImage || (activeImage && failedImages.has(activeImage.id));

  const handleImageError = (imageId: string) => {
    setFailedImages((prev) => new Set(prev).add(imageId));
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-slate-100 shadow-inner">
        {showPlaceholder ? (
          <PlaceholderPanel label={brand ?? productName} />
        ) : (
          <Image
            key={activeImage.id}
            src={activeImage.url}
            alt={`${brand ?? ''} ${productName}`}
            fill
            sizes="(min-width: 1024px) 520px, 90vw"
            className="object-contain"
            priority
            onError={() => handleImageError(activeImage.id)}
          />
        )}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveImageId(image.id)}
              className={clsx(
                'relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border',
                activeImage?.id === image.id ? 'border-brand-500 ring-2 ring-brand-200' : 'border-slate-200',
                failedImages.has(image.id) && 'opacity-30'
              )}
            >
              {failedImages.has(image.id) ? (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                  —
                </div>
              ) : (
                <Image
                  src={image.url}
                  alt={`${productName} thumbnail`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  onError={() => handleImageError(image.id)}
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  const { gradientStart, gradientEnd, initial } = useMemo(() => derivePlaceholder(label), [label]);

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 text-white"
      style={{ backgroundImage: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-4xl font-semibold">
        {initial}
      </div>
      <p className="px-6 text-center text-sm font-medium uppercase tracking-[0.3em] opacity-80">
        Media pending
      </p>
    </div>
  );
}

function derivePlaceholder(seed: string) {
  const normalized = seed.trim() || 'Promos Ink';
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


