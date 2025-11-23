#!/usr/bin/env tsx

import 'tsconfig-paths/register';
import { config } from 'dotenv';
import path from 'node:path';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

interface SmokeResult {
  name: string;
  status: number;
  details?: Record<string, unknown>;
}

const API_TESTS = [
  { name: 'health', path: '/api/health' },
  { name: 'search-5000', path: '/api/products/search?query=5000' },
  { name: 'search-pc43', path: '/api/products/search?query=PC43' },
];

const PAGE_TESTS = [
  { name: 'page-search-5000', path: '/search?query=5000' },
  { name: 'page-search-pc43', path: '/search?query=pc43' },
];

async function runApiTests(baseUrl: string): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  for (const test of API_TESTS) {
    const response = await fetch(`${baseUrl}${test.path}`, { headers: { accept: 'application/json' } });
    let details: Record<string, unknown> | undefined;
    if (response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      if ('meta' in json) {
        details = {
          directHit: json.meta?.directHit,
          count: json.meta?.count,
          canonicalStyleId: json.items?.[0]?.canonicalStyleId,
        };
      } else {
        details = json;
      }
    } else {
      details = { body: await response.text() };
    }
    results.push({ name: test.name, status: response.status, details });
  }
  return results;
}

async function runPageTests(baseUrl: string): Promise<SmokeResult[]> {
  const results: SmokeResult[] = [];
  for (const test of PAGE_TESTS) {
    const response = await fetch(`${baseUrl}${test.path}`, {
      redirect: 'manual',
    });
    const details: Record<string, unknown> = {
      location: response.headers.get('location') ?? undefined,
    };
    results.push({ name: test.name, status: response.status, details });
  }
  return results;
}

async function main() {
  const baseUrl = process.argv[2] ?? process.env.SMOKE_BASE_URL;
  if (!baseUrl) {
    throw new Error('Usage: npm run test:smoke -- https://deployment-url');
  }

  console.log(`Running smoke tests against ${baseUrl}`);
  const apiResults = await runApiTests(baseUrl);
  const pageResults = await runPageTests(baseUrl);

  for (const result of [...apiResults, ...pageResults]) {
    console.log('---');
    console.log(`${result.name}: HTTP ${result.status}`);
    if (result.details) {
      console.log(result.details);
    }
  }
}

main().catch((error) => {
  console.error('Smoke tests failed', error);
  process.exitCode = 1;
});

