import '../src/lib/prisma';

import { prisma } from '../src/lib/prisma';
import { syncSanmarCatalog } from '../src/services/sanmar/catalog';

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

async function main() {
  const options = parseArgs();
  console.log('Starting SanMar catalog sync', {
    modifiedSince: options.modifiedSince?.toISOString() ?? null,
    pageSize: options.pageSize ?? null,
    maxPages: options.maxPages ?? null,
    dryRun: options.dryRun ?? false,
  });

  const result = await syncSanmarCatalog(prisma, options);

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
