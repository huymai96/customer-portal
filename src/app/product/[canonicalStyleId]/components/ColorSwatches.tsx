'use client';

import clsx from 'clsx';
import { useMemo } from 'react';

import type { ColorOption } from './types';

interface ColorSwatchesProps {
  colors?: ColorOption[];
  selectedColorCode: string | null;
  onSelectColor: (colorCode: string) => void;
}

// Comprehensive color mapping for common apparel colors
export const FALLBACK_COLORS: Record<string, string> = {
  // Basic colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  NAVY: '#1E293B',
  RED: '#DC2626',
  ROYAL: '#2563EB',
  BLUE: '#2563EB',
  GREEN: '#16A34A',
  PINK: '#F472B6',
  GREY: '#94A3B8',
  GRAY: '#94A3B8',
  YELLOW: '#FCD34D',
  ORANGE: '#F97316',
  PURPLE: '#9333EA',
  BROWN: '#92400E',
  KHAKI: '#A3A3A3',
  // SanMar/S&S specific
  TRUE_ROYAL: '#2563EB',
  TRUE_NAVY: '#1E3A8A',
  VTGRED: '#DC2626',
  VTG_RED: '#DC2626',
  VTG: '#DC2626',
  VINTAGE: '#DC2626',
  AQUATIC_BLUE: '#0EA5E9',
  ASH: '#94A3B8',
  CHARCOAL: '#374151',
  DARK_GREEN: '#065F46',
  FOREST_GREEN: '#166534',
  FOREST: '#166534',
  GOLD: '#FCD34D',
  KELLY: '#16A34A',
  KELLY_GREEN: '#16A34A',
  LAVENDER: '#C084FC',
  SAPPHIRE: '#1E40AF',
  SILVER: '#9CA3AF',
  STEEL_BLUE: '#3B82F6',
  VIOLET: '#7C3AED',
  // Heather variants
  HEATHER_GREY: '#94A3B8',
  HEATHER_GRAY: '#94A3B8',
  HEATHER_NAVY: '#475569',
  HEATHER_BLUE: '#64748B',
  HEATHER_BLACK: '#1E293B',
  HEATHER: '#94A3B8',
  // Additional common codes
  DARK_HEATHER: '#475569',
  LIGHT_BLUE: '#93C5FD',
  DARK_BLUE: '#1E3A8A',
  MAROON: '#991B1B',
  BURGUNDY: '#991B1B',
  TEAL: '#14B8A6',
  LIME: '#84CC16',
  CORAL: '#FB7185',
  // More specific SanMar colors
  CAROLINA_BLUE: '#0EA5E9',
  COLUMBIA_BLUE: '#93C5FD',
  DARK_HEATHER_GREY: '#475569',
  DARK_HEATHER_GRAY: '#475569',
  SAND: '#FCD34D',
  TAN: '#D97706',
  CREAM: '#FEF3C7',
  IVORY: '#FFFBEB',
  NATURAL: '#FEF3C7',
  OXFORD: '#64748B',
  SPORT_GREY: '#94A3B8',
  SPORT_GRAY: '#94A3B8',
  // PC43 specific colors from verification (AQUATIC_BLUE already defined above)
  ATHLHTHR: '#94A3B8', // Athletic Heather
  ATHLMAROON: '#991B1B', // Athletic Maroon
  AWARENESS_PINK: '#F472B6',
  BLKHTHR: '#1E293B', // Black Heather
  BRIGHT_AQUA: '#0EA5E9',
  CHERRY_BLOSSOM: '#FB7185',
  COYOTEBRN: '#92400E', // Coyote Brown
  DKCHOCBRN: '#78350F', // Dark Chocolate Brown
  DKHTGRY: '#475569', // Dark Heather Grey
  DUCK_BROWN: '#92400E',
  FLUSH_PINK: '#F472B6',
  GPHHEATHER: '#94A3B8', // Graphite Heather
  HEATHER_PURPLE: '#9333EA',
  ICE_BLUE: '#93C5FD',
  JET_BLACK: '#000000',
  LAUREL_GREEN: '#16A34A',
  LIGHT_SAND: '#FEF3C7',
  MEDIUM_GREY: '#94A3B8',
  NEON_PINK: '#F472B6',
  OLVDRABGN: '#84CC16', // Olive Drab Green
  OLVDRABGNH: '#84CC16', // Olive Drab Green Heather
  SAPPHIREHT: '#1E40AF', // Sapphire Heather
  S_GREEN: '#16A34A', // Safety Green
  S_ORANGE: '#F97316', // Safety Orange
  SPEARMINT: '#14B8A6',
  TEAM_PURPLE: '#9333EA',
  TENNORANGE: '#F97316', // Tennis Orange
  VIVDTEALHR: '#14B8A6', // Vivid Teal Heather
};

function getColorHex(colorCode: string, colorName?: string | null): string {
  const normalizedCode = colorCode.toUpperCase().replace(/[_\s-]/g, '_');
  const normalizedName = colorName?.toUpperCase().replace(/[_\s-]/g, '_') ?? '';
  
  // Priority 1: Exact match on code
  if (FALLBACK_COLORS[normalizedCode]) {
    return FALLBACK_COLORS[normalizedCode];
  }
  
  // Priority 2: Exact match on name
  if (normalizedName && FALLBACK_COLORS[normalizedName]) {
    return FALLBACK_COLORS[normalizedName];
  }
  
  // Priority 3: StartsWith match (e.g., "HEATHER_NAVY" starts with "HEATHER")
  const sortedKeys = Object.keys(FALLBACK_COLORS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalizedCode.startsWith(key) || normalizedName.startsWith(key)) {
      return FALLBACK_COLORS[key];
    }
    if (key.startsWith(normalizedCode) || key.startsWith(normalizedName)) {
      return FALLBACK_COLORS[key];
    }
  }
  
  // Priority 4: Contains tokens (e.g., "DARK_HEATHER_NAVY" contains "NAVY")
  for (const key of sortedKeys) {
    if (normalizedCode.includes(key) || normalizedName.includes(key)) {
      return FALLBACK_COLORS[key];
    }
    if (key.includes(normalizedCode) || key.includes(normalizedName)) {
      return FALLBACK_COLORS[key];
    }
  }
  
  // Priority 5: Extract base color from compound names
  const baseColors = ['BLACK', 'WHITE', 'NAVY', 'RED', 'BLUE', 'GREEN', 'GRAY', 'GREY', 'ORANGE', 'PURPLE', 'PINK', 'YELLOW', 'BROWN', 'ROYAL', 'CHARCOAL', 'SILVER', 'GOLD'];
  for (const base of baseColors) {
    if (normalizedCode.includes(base) || normalizedName.includes(base)) {
      const baseHex = FALLBACK_COLORS[base];
      if (baseHex) return baseHex;
    }
  }
  
  // Priority 6: Normalized match (remove common prefixes)
  const withoutPrefix = normalizedCode.replace(/^(HEATHER|DARK|LIGHT|VTG|VINTAGE|ATHL|SPORT)_/i, '');
  if (withoutPrefix !== normalizedCode && FALLBACK_COLORS[withoutPrefix]) {
    return FALLBACK_COLORS[withoutPrefix];
  }
  
  // Default gradient placeholder
  return '#CBD5F5';
}

export function ColorSwatches({ colors = [], selectedColorCode, onSelectColor }: ColorSwatchesProps) {
  const sortedColors = useMemo(() => {
    return [...colors].sort((a, b) => {
      const aLabel = (a.colorName ?? a.colorCode).toUpperCase();
      const bLabel = (b.colorName ?? b.colorCode).toUpperCase();
      if (aLabel === bLabel) {
        return a.colorCode.localeCompare(b.colorCode);
      }
      return aLabel.localeCompare(bLabel);
    });
  }, [colors]);

  if (!sortedColors.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          Colors {selectedColorCode ? (
            <span className="text-slate-500">
              / {colors.find(c => c.colorCode === selectedColorCode)?.colorName || selectedColorCode}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-slate-500">{sortedColors.length} options</p>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {sortedColors.map((color) => {
          const isSelected = selectedColorCode === color.colorCode;
          const displayName = color.colorName ?? color.colorCode;
          
          return (
            <button
              key={color.colorCode}
              type="button"
              onClick={() => onSelectColor(color.colorCode)}
              className={clsx(
                'group relative flex flex-col items-center gap-2 rounded-lg p-2 transition-all',
                isSelected 
                  ? 'bg-brand-50 ring-2 ring-brand-500' 
                  : 'hover:bg-slate-50'
              )}
              title={`${displayName} (${color.colorCode})`}
            >
              <div className="relative">
                <div
                  className={clsx(
                    'h-12 w-12 rounded-full border-2 shadow-sm transition-transform',
                    isSelected 
                      ? 'border-brand-500 scale-110' 
                      : 'border-slate-200 group-hover:scale-105 group-hover:border-slate-300'
                  )}
                  style={{
                    backgroundImage: color.swatchUrl ? `url(${color.swatchUrl})` : undefined,
                    backgroundColor: color.swatchUrl ? undefined : getColorHex(color.colorCode, color.colorName),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                {isSelected && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 shadow-sm">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <span 
                className={clsx(
                  'line-clamp-2 text-center text-xs leading-tight',
                  isSelected ? 'font-semibold text-brand-700' : 'text-slate-600 group-hover:text-slate-900'
                )}
              >
                {displayName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


