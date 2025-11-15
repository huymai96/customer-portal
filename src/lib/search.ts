import { getFeaturedProducts, listCatalog } from '@/lib/catalog';

import type { CatalogProduct } from '@/lib/catalog';

export interface SearchHit {
  product: CatalogProduct;
  score: number;
  reason: string;
}

function normalizeQuery(query: string) {
  return query.trim();
}

function tokenize(query: string) {
  if (!query) {
    return [];
  }
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function findExactProductMatch(query: string): CatalogProduct | null {
  const normalized = normalizeQuery(query).toUpperCase();
  if (!normalized) {
    return null;
  }
  const match = listCatalog().filter((product) => product.styleCode.toUpperCase() === normalized);
  if (match.length === 1) {
    return match[0];
  }
  return null;
}

export function searchCatalogProducts(query: string, limit = listCatalog().length): SearchHit[] {
  const trimmed = normalizeQuery(query);
  const catalog = listCatalog();

  if (!trimmed) {
    return getFeaturedProducts(limit).map((product, index) => ({
      product,
      score: 50 - index,
      reason: 'Featured style',
    }));
  }

  const normalizedUpper = trimmed.toUpperCase();
  const tokens = tokenize(trimmed);

  const hits = catalog
    .map((product) => {
      const styleUpper = product.styleCode.toUpperCase();
      const styleLower = styleUpper.toLowerCase();
      const nameLower = product.name.toLowerCase();
      const brandLower = product.brand.toLowerCase();

      let score = 0;
      let matched = false;
      let reason: string | undefined;

      if (styleUpper === normalizedUpper) {
        score += 120;
        matched = true;
        reason = 'Exact style match';
      } else if (styleUpper.startsWith(normalizedUpper)) {
        score += 95;
        matched = true;
        reason = 'Style prefix match';
      } else if (styleUpper.includes(normalizedUpper)) {
        score += 70;
        matched = true;
        reason = 'Style contains search';
      }

      const tokenMatches = tokens.map((token) => {
        if (styleLower.includes(token)) {
          score += 25;
          matched = true;
          if (!reason) {
            reason = 'Style contains term';
          }
          return true;
        }
        if (brandLower.includes(token)) {
          score += 18;
          matched = true;
          if (!reason) {
            reason = 'Brand matches search';
          }
          return true;
        }
        if (nameLower.includes(token)) {
          score += 16;
          matched = true;
          if (!reason) {
            reason = 'Product name matches search';
          }
          return true;
        }
        return false;
      });

      const allTokensMatched = tokens.length === 0 || tokenMatches.every(Boolean);

      if (!matched && !allTokensMatched) {
        return null;
      }

      if (allTokensMatched) {
        score += 5;
      }

      const supplierCoverageBonus = Math.min(product.suppliers.length * 4, 12);
      score += supplierCoverageBonus;

      return {
        product,
        score,
        reason: reason ?? 'Catalog match',
      };
    })
    .filter((hit): hit is SearchHit => Boolean(hit))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return hits;
}

export function getSearchFallbacks(limit = 4): CatalogProduct[] {
  return getFeaturedProducts(limit);
}


