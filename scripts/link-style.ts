#!/usr/bin/env tsx
/**
 * Canonical style linker
 *
 * Usage:
 *   npx tsx scripts/link-style.ts --style 1717 --supplier sanmar --part 1717 --display "Comfort Colors Heavyweight" --brand "Comfort Colors"
 */

import 'tsconfig-paths/register';
import { SupplierSource } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { ensureCanonicalStyleLink } from '@/services/canonical-style';

interface CliOptions {
  styleNumber: string;
  supplier: SupplierSource;
  supplierPartId: string;
  displayName?: string;
  brand?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let styleNumber: string | undefined;
  let supplier: SupplierSource | undefined;
  let supplierPartId: string | undefined;
  let displayName: string | undefined;
  let brand: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (!arg.startsWith('--')) {
      continue;
    }
    switch (arg) {
      case '--style':
      case '--canonical':
      case '--styleNumber':
        styleNumber = next;
        i += 1;
        break;
      case '--supplier':
        if (!next) break;
        {
          const normalized = next.trim().toUpperCase();
          if (!(normalized in SupplierSource)) {
            throw new Error(
              `Invalid supplier "${next}". Valid options: ${Object.keys(SupplierSource).join(', ')}`
            );
          }
          supplier = SupplierSource[normalized as keyof typeof SupplierSource];
        }
        i += 1;
        break;
      case '--part':
      case '--supplierPart':
        supplierPartId = next;
        i += 1;
        break;
      case '--display':
      case '--displayName':
        displayName = next;
        i += 1;
        break;
      case '--brand':
        brand = next;
        i += 1;
        break;
      default:
        // ignore unknown flags; allows passing values with equals sign
        break;
    }
  }

  if (!styleNumber) {
    throw new Error('Missing required --style <STYLE_NUMBER>');
  }
  if (!supplier) {
    throw new Error('Missing required --supplier <SANMAR|SSACTIVEWEAR>');
  }
  if (!supplierPartId) {
    throw new Error('Missing required --part <SUPPLIER_PART_ID>');
  }

  return {
    styleNumber: styleNumber.trim(),
    supplier,
    supplierPartId: supplierPartId.trim(),
    displayName: displayName?.trim(),
    brand: brand?.trim(),
  };
}

async function main(): Promise<void> {
  const options = parseArgs();

  console.log('Linking style:');
  console.log(`  Canonical style: ${options.styleNumber}`);
  console.log(`  Supplier: ${options.supplier}`);
  console.log(`  Supplier Part: ${options.supplierPartId}`);

  await ensureCanonicalStyleLink(prisma, {
    supplier: options.supplier,
    supplierPartId: options.supplierPartId,
    styleNumber: options.styleNumber,
    displayName: options.displayName,
    brand: options.brand,
  });

  console.log('Link created/updated successfully.');
}

main()
  .catch((error) => {
    console.error('Failed to link style:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

