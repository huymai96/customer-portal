import path from 'path';

import { importSanmarDipInventory } from '../src/services/sanmar/dip-importer';

async function main() {
  const baseDir = path.resolve(process.env.SANMAR_LOCAL_DIR ?? 'tmp/sanmar');
  const dipPath = process.env.SANMAR_DIP_PATH ?? path.join(baseDir, 'sanmar_dip.txt');

  console.log('Importing SanMar DIP inventory', { dipPath });

  const result = await importSanmarDipInventory({ dipPath, dryRun: process.env.DRY_RUN === 'true' });
  console.log('SanMar DIP inventory import complete', result);
}

main().catch((error) => {
  console.error('SanMar DIP inventory import failed', error);
  process.exitCode = 1;
});
