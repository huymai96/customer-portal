#!/usr/bin/env tsx
import 'tsconfig-paths/register';
import fs from 'node:fs';
import path from 'node:path';

import { SupplierSource } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { ensureCanonicalStyleLink, guessCanonicalStyleNumber } from '@/services/canonical-style';

interface SeedLink {
  supplier: keyof typeof SupplierSource;
  supplierPartId: string;
}

interface SeedEntry {
  styleNumber?: string;
  displayName?: string;
  brand?: string;
  links: SeedLink[];
}

interface CliOptions {
  filePath: string;
  apply: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let filePath = path.resolve('data/canonical-style-seed.json');
  let apply = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--file' && args[i + 1]) {
      filePath = path.resolve(args[i + 1]);
      i += 1;
    } else if (arg === '--apply') {
      apply = true;
    }
  }

  return { filePath, apply };
}

async function seedEntries(entries: SeedEntry[], apply: boolean): Promise<void> {
  for (const entry of entries) {
    const styleNumber =
      entry.styleNumber ??
      guessCanonicalStyleNumber({
        supplier: SupplierSource.SANMAR,
        supplierPartId: entry.links[0]?.supplierPartId ?? 'UNKNOWN',
        brand: entry.brand,
      });

    console.log(`\n[${styleNumber}] ${entry.displayName ?? 'Unnamed style'}`);
    console.log(`  Brand: ${entry.brand ?? 'n/a'}`);

    if (!entry.links?.length) {
      console.warn('  No supplier links defined, skipping.');
      continue;
    }

    for (const link of entry.links) {
      const supplier = SupplierSource[link.supplier as keyof typeof SupplierSource];
      if (!supplier) {
        console.warn(`  Unknown supplier "${link.supplier}", skipping link.`);
        continue;
      }

      if (!apply) {
        console.log(`  (dry-run) would link ${supplier} -> ${link.supplierPartId}`);
        continue;
      }

      try {
        await ensureCanonicalStyleLink(prisma, {
          supplier,
          supplierPartId: link.supplierPartId,
          styleNumber,
          displayName: entry.displayName ?? undefined,
          brand: entry.brand ?? undefined,
        });
        console.log(`  Linked ${supplier} -> ${link.supplierPartId}`);
      } catch (error) {
        console.error(`  Failed linking ${supplier}:${link.supplierPartId}`, error);
      }
    }
  }
}

async function main() {
  const options = parseArgs();

  if (!fs.existsSync(options.filePath)) {
    console.error(`Seed file not found: ${options.filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(options.filePath, 'utf-8');
  const entries = JSON.parse(raw) as SeedEntry[];

  console.log(`Seeding ${entries.length} canonical styles from ${options.filePath}`);
  if (!options.apply) {
    console.log('Running in dry-run mode. Pass --apply to persist changes.');
  }

  await seedEntries(entries, options.apply);

  console.log('\nDone.');
}

main()
  .catch((error) => {
    console.error('Failed to seed canonical styles:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

