interface WarehouseDefinition {
  canonicalId: string;
  displayName: string;
  aliases: string[];
}

const SANMAR_WAREHOUSE_DEFINITIONS: WarehouseDefinition[] = [
  { canonicalId: 'DAL', displayName: 'Dallas, TX', aliases: ['1', 'DAL'] },
  { canonicalId: 'CIN', displayName: 'Cincinnati, OH', aliases: ['2', 'CIN'] },
  { canonicalId: 'PHX', displayName: 'Phoenix, AZ', aliases: ['3', 'PHX'] },
  { canonicalId: 'RNO', displayName: 'Reno, NV', aliases: ['4', 'RNO'] },
  { canonicalId: 'ATL', displayName: 'Atlanta, GA', aliases: ['5', 'ATL'] },
  { canonicalId: 'CHI', displayName: 'Chicago, IL', aliases: ['6', 'CHI'] },
  { canonicalId: 'LAX', displayName: 'Los Angeles, CA', aliases: ['7', 'LAX'] },
  { canonicalId: 'SEA', displayName: 'Seattle, WA', aliases: ['12', 'SEA'] },
  { canonicalId: 'JAX', displayName: 'Jacksonville, FL', aliases: ['31', 'JAX'] },
];

export const SANMAR_WAREHOUSE_NAMES: Record<string, string> = {};

const SANMAR_WAREHOUSE_CANONICAL_LOOKUP: Record<
  string,
  { canonicalId: string; displayName: string }
> = {};

for (const definition of SANMAR_WAREHOUSE_DEFINITIONS) {
  for (const alias of definition.aliases) {
    const trimmed = alias.trim();
    const upper = trimmed.toUpperCase();

    SANMAR_WAREHOUSE_NAMES[trimmed] = definition.displayName;
    SANMAR_WAREHOUSE_NAMES[upper] = definition.displayName;
    SANMAR_WAREHOUSE_CANONICAL_LOOKUP[trimmed] = {
      canonicalId: definition.canonicalId,
      displayName: definition.displayName,
    };
    SANMAR_WAREHOUSE_CANONICAL_LOOKUP[upper] = {
      canonicalId: definition.canonicalId,
      displayName: definition.displayName,
    };
  }
}

export function getWarehouseDisplayName(
  warehouseId: string,
  warehouseName?: string | null,
  supplier?: string
): string {
  if (warehouseName && warehouseName.trim().length > 0) {
    return warehouseName;
  }

  const normalizedSupplier = String(supplier || '').toUpperCase().trim();
  if (normalizedSupplier === 'SANMAR') {
    if (SANMAR_WAREHOUSE_NAMES[warehouseId]) {
      return SANMAR_WAREHOUSE_NAMES[warehouseId];
    }
    const upper = warehouseId.toUpperCase().trim();
    if (SANMAR_WAREHOUSE_NAMES[upper]) {
      return SANMAR_WAREHOUSE_NAMES[upper];
    }
  }

  return warehouseId;
}

export function normalizeSanmarWarehouseId(
  warehouseId: string,
  warehouseName?: string | null
): { warehouseId: string; warehouseName: string | null } {
  const trimmedId = warehouseId?.trim();
  if (!trimmedId) {
    return {
      warehouseId: '',
      warehouseName: warehouseName?.trim() || null,
    };
  }

  const upperId = trimmedId.toUpperCase();
  const mapping =
    SANMAR_WAREHOUSE_CANONICAL_LOOKUP[trimmedId] ??
    SANMAR_WAREHOUSE_CANONICAL_LOOKUP[upperId];

  if (mapping) {
    return {
      warehouseId: mapping.canonicalId,
      warehouseName: warehouseName?.trim()?.length
        ? warehouseName.trim()
        : mapping.displayName,
    };
  }

  return {
    warehouseId: upperId,
    warehouseName: warehouseName?.trim() || null,
  };
}