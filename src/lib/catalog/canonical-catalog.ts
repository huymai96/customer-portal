import fs from 'node:fs';
import path from 'node:path';

import type { SupplierCode } from '@/lib/types';

export type CanonicalSku = string;

export interface CanonicalSupplierMapping {
  style: string;
}

export interface CanonicalMappingRecord {
  canonicalSku: CanonicalSku;
  name: string;
  brand?: string;
  aliases: string[];
  suppliers: Partial<Record<SupplierCode, CanonicalSupplierMapping>>;
}

export interface ResolvedSearchResult {
  exactMatch: CanonicalMappingRecord | null;
  candidates: CanonicalMappingRecord[];
}

let cachedMappings: CanonicalMappingRecord[] | null = null;

function validateCanonicalMappings(records: CanonicalMappingRecord[]): void {
  const seenCanonical = new Set<string>();
  const aliasOwners = new Map<string, string>();
  const supplierStyleOwners = new Map<string, string>();

  for (const record of records) {
    if (seenCanonical.has(record.canonicalSku)) {
      throw new Error(
        `Duplicate canonicalSku detected in data/canonical-mapping.json: ${record.canonicalSku}`
      );
    }
    seenCanonical.add(record.canonicalSku);

    const normalizedAliases = new Set<string>();
    for (const alias of record.aliases ?? []) {
      const normalized = alias.trim().toUpperCase();
      if (normalized.length === 0) {
        continue;
      }
      if (normalizedAliases.has(normalized)) {
        console.warn(
          `[canonical-mapping] Duplicate alias "${normalized}" detected for ${record.canonicalSku}; ignoring duplicate entry.`
        );
        continue;
      }
      normalizedAliases.add(normalized);
    }
    record.aliases = Array.from(normalizedAliases);

    const aliasCandidates = new Set<string>([record.canonicalSku, ...record.aliases]);
    for (const alias of aliasCandidates) {
      const existingOwner = aliasOwners.get(alias);
      if (existingOwner && existingOwner !== record.canonicalSku) {
        throw new Error(
          `Alias "${alias}" is assigned to multiple canonical styles (${existingOwner} and ${record.canonicalSku}).`
        );
      }
      aliasOwners.set(alias, record.canonicalSku);
    }

    if (record.suppliers) {
      for (const [supplier, mapping] of Object.entries(record.suppliers)) {
        if (!mapping?.style) {
          continue;
        }
        const normalizedKey = `${supplier.trim().toUpperCase()}:${mapping.style
          .trim()
          .toUpperCase()}`;
        const existing = supplierStyleOwners.get(normalizedKey);
        if (existing && existing !== record.canonicalSku) {
          throw new Error(
            `Supplier/style "${normalizedKey}" is mapped to multiple canonical styles (${existing} and ${record.canonicalSku}).`
          );
        }
        supplierStyleOwners.set(normalizedKey, record.canonicalSku);
      }
    }
  }
}

export function loadCanonicalMappings(): CanonicalMappingRecord[] {
  if (cachedMappings) {
    return cachedMappings;
  }
  const mappingPath = path.resolve(process.cwd(), 'data', 'canonical-mapping.json');
  const raw = fs.readFileSync(mappingPath, 'utf-8');
  const parsed = JSON.parse(raw) as CanonicalMappingRecord[];
  const normalized = parsed.map((entry) => {
    const canonicalSku = entry.canonicalSku.trim().toUpperCase();
    const aliases = (entry.aliases ?? [])
      .map((alias) => alias.trim().toUpperCase())
      .filter((alias) => alias.length > 0);

    const suppliers: Partial<Record<SupplierCode, CanonicalSupplierMapping>> = {};
    if (entry.suppliers) {
      for (const [supplierKey, mapping] of Object.entries(entry.suppliers)) {
        const supplier = supplierKey.trim().toUpperCase() as SupplierCode;
        if (!mapping?.style) {
          continue;
        }
        suppliers[supplier] = {
          style: mapping.style.trim().toUpperCase(),
        };
      }
    }

    return {
      ...entry,
      canonicalSku,
      aliases,
      suppliers,
    };
  });
  validateCanonicalMappings(normalized);
  cachedMappings = normalized;
  return cachedMappings;
}

export function findCanonicalBySku(canonicalSku: string): CanonicalMappingRecord | null {
  const normalized = canonicalSku.trim().toUpperCase();
  return loadCanonicalMappings().find((entry) => entry.canonicalSku === normalized) ?? null;
}

export function findCanonicalByAlias(value: string): CanonicalMappingRecord | null {
  const normalized = value.trim().toUpperCase();
  return (
    loadCanonicalMappings().find(
      (entry) =>
        entry.canonicalSku === normalized || entry.aliases.some((alias) => alias === normalized)
    ) ?? null
  );
}

export function resolveSearchTerm(term: string): ResolvedSearchResult {
  const normalized = term.trim().toUpperCase();
  if (!normalized) {
    return { exactMatch: null, candidates: [] };
  }

  const mappings = loadCanonicalMappings();
  const exactMatch = findCanonicalByAlias(normalized);

  if (exactMatch) {
    return { exactMatch, candidates: [exactMatch] };
  }

  const candidates = mappings.filter((entry) => {
    if (entry.canonicalSku.includes(normalized)) {
      return true;
    }
    return entry.aliases.some((alias) => alias.includes(normalized));
  });

  return { exactMatch: null, candidates };
}

