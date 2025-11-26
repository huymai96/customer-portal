/**
 * Push Prisma schema to database (without migrations)
 */
require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

// Fix DATABASE_URL if it has quotes
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '');
}

console.log('Pushing Prisma schema to database...');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');

try {
  execSync('npx prisma db push', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('\n✅ Schema push completed successfully!');
  
  // Generate client
  console.log('\nGenerating Prisma client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('\n✅ Prisma client generated!');
  
} catch (error) {
  console.error('\n❌ Push failed:', error.message);
  process.exit(1);
}

