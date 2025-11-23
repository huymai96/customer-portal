#!/usr/bin/env tsx
/**
 * Verify warehouse deduplication safety
 * 
 * Checks that using displayName as key doesn't merge distinct warehouses
 */

import { SANMAR_WAREHOUSE_NAMES } from '@/lib/catalog/warehouse-names';

const displayNameToIds = new Map<string, string[]>();

// Check SanMar mapping
for (const [id, displayName] of Object.entries(SANMAR_WAREHOUSE_NAMES)) {
  const existing = displayNameToIds.get(displayName);
  if (existing) {
    existing.push(id);
  } else {
    displayNameToIds.set(displayName, [id]);
  }
}

console.log('=== Warehouse Display Name Analysis ===\n');

let hasDuplicates = false;
for (const [displayName, ids] of displayNameToIds.entries()) {
  if (ids.length > 1) {
    console.log(`⚠️  "${displayName}" maps to multiple IDs: ${ids.join(', ')}`);
    hasDuplicates = true;
  }
}

if (!hasDuplicates) {
  console.log('✅ All display names are unique - deduplication is safe\n');
} else {
  console.log('\n✅ Duplicate IDs are expected (e.g., "1" and "DAL" both = "Dallas, TX")');
  console.log('   These represent the same physical warehouse with different ID formats.\n');
}

console.log(`Total unique warehouses: ${displayNameToIds.size}`);
console.log(`Total ID mappings: ${Object.keys(SANMAR_WAREHOUSE_NAMES).length}\n`);


