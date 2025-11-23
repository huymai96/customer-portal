#!/usr/bin/env tsx
/**
 * Run cart migration against production database
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/run-cart-migration.ts
 * 
 * Or set DATABASE_URL in .env.production and run:
 *   npx tsx scripts/run-cart-migration.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';

// Load environment variables
const envFiles = ['.env.production', '.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set.');
  console.error('   Set it to your production database connection string.');
  console.error('   Example: DATABASE_URL="postgresql://user:pass@host:port/db?schema=portal_catalog"');
  process.exit(1);
}

console.log('🚀 Running cart migration against production database...\n');
console.log(`   Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

try {
  // Run Prisma migrate deploy
  execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL,
    },
  });
  
  console.log('\n✅ Migration completed successfully!');
  console.log('   Cart and CartLine tables should now exist in production.');
  console.log('   Test by adding items to cart on the product pages.\n');
} catch (error) {
  console.error('\n❌ Migration failed!');
  console.error('   Check the error message above for details.');
  console.error('   Verify DATABASE_URL points to the correct production database.');
  process.exit(1);
}



