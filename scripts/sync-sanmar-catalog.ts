import path from 'node:path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import '../src/lib/prisma';

import type { PrismaClient } from '@prisma/client';

import { prisma } from '../src/lib/prisma';
import { syncSanmarCatalog } from '../src/services/sanmar/catalog';
import { buildSanMarAuthHeader, getSanMarClient } from '../src/lib/sanmar/soapClient';
import type { GenericSoapClient } from '../src/lib/sanmar/soapClient';

interface CliOptions {
  modifiedSince?: Date;
  pageSize?: number;
  maxPages?: number;
  dryRun?: boolean;
}

function parseArgs(): CliOptions {
  const options: CliOptions = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith('--modifiedSince=')) {
      const value = arg.split('=')[1];
      const date = new Date(value);
      if (!Number.isNaN(date.valueOf())) {
        options.modifiedSince = date;
      }
    } else if (arg.startsWith('--pageSize=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(value) && value > 0) {
        options.pageSize = value;
      }
    } else if (arg.startsWith('--maxPages=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(value) && value > 0) {
        options.maxPages = value;
      }
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    }
  }
  return options;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function resolveSoapClient(): Promise<GenericSoapClient> {
  const wsdlUrl = requireEnv('SANMAR_PRODUCT_WSDL');
  const username = requireEnv('SANMAR_USER');
  const password = requireEnv('SANMAR_PASSWORD');
  const namespacePrefix = process.env.SANMAR_SOAP_NAMESPACE_PREFIX ?? 'tem';
  const namespaceUri =
    process.env.SANMAR_SOAP_NAMESPACE_URI ?? 'http://tempuri.org/';
  const endpoint = process.env.SANMAR_PRODUCT_ENDPOINT;

  const authHeader = buildSanMarAuthHeader({
    username,
    password,
    namespacePrefix,
    namespaceUri,
  });

  return getSanMarClient({
    wsdlUrl,
    endpoint,
    authHeaderXml: authHeader,
    namespacePrefix,
    namespaceUri,
  });
}

async function main() {
  const options = parseArgs();
  console.log('Starting SanMar catalog sync', {
    modifiedSince: options.modifiedSince?.toISOString() ?? null,
    pageSize: options.pageSize ?? null,
    maxPages: options.maxPages ?? null,
    dryRun: options.dryRun ?? false,
  });

  const client = await resolveSoapClient();
  const result = await syncSanmarCatalog(prisma as PrismaClient, {
    ...options,
    soapClient: client,
  });

  console.log('SanMar catalog sync complete', result);
}

main()
  .catch((error) => {
    console.error('SanMar catalog sync failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
