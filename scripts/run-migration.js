/**
 * Run Prisma migration with proper env loading
 */
require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

// Fix DATABASE_URL if it has quotes
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '');
}

console.log('Running Prisma migration...');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');

try {
  execSync('npx prisma migrate dev --name add_quote_approval_workflow', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('\n✅ Migration completed successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}

