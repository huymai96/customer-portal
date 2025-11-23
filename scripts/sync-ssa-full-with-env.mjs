#!/usr/bin/env node
/**
 * Wrapper to run the SSActivewear full catalog sync with environment loaded.
 * Usage: node scripts/sync-ssa-full-with-env.mjs [--limit 100] [--brands "Gildan,Adidas"]
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const syncScriptPath = resolve(projectRoot, 'scripts', 'sync-ssactivewear-full-catalog.ts');

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = resolve(projectRoot, envFile);
  const { error } = config({ path: envPath, override: false });
  if (error && error.code !== 'ENOENT') {
    console.warn(`Failed to load ${envFile}: ${error.message}`);
  }
}

const requiredEnvVars = ['SSACTIVEWEAR_ACCOUNT_NUMBER', 'SSACTIVEWEAR_API_KEY'];
const missing = requiredEnvVars.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(
    `Missing SSActivewear environment variables: ${missing.join(
      ', ',
    )}. Please set them before running this script.`,
  );
  process.exit(1);
}

const args = process.argv.slice(2);

const localTsx = resolve(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
);
const hasLocalTsx = existsSync(localTsx);
const command = hasLocalTsx ? localTsx : process.platform === 'win32' ? 'npx.cmd' : 'npx';
const spawnArgs = hasLocalTsx ? [syncScriptPath, ...args] : ['tsx', syncScriptPath, ...args];

const child = spawn(command, spawnArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (error) => {
  console.error('Failed to start SSActivewear sync:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
});
