#!/usr/bin/env node
/**
 * Wrapper to run SSActivewear full catalog sync with environment loaded
 * Usage: node scripts/sync-ssa-full-with-env.mjs [--limit 100] [--brands "Gildan,Adidas"]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Set SSActivewear credentials explicitly
process.env.SSACTIVEWEAR_ACCOUNT_NUMBER = '72555';
process.env.SSACTIVEWEAR_API_KEY = '2205ef54-d443-48d2-aeee-58c81f73faed';

// Run the sync script
const args = process.argv.slice(2);
const child = spawn('npx', ['tsx', 'scripts/sync-ssactivewear-full-catalog.ts', ...args], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

