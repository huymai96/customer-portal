import path from 'path';

import { importSanmarCatalog } from '../src/services/sanmar/importer';

async function main() {
  const baseDir = path.resolve(process.env.SANMAR_LOCAL_DIR ?? 'tmp/sanmar');
  const sdlPath = process.env.SANMAR_SDL_PATH ?? path.join(baseDir, 'SanMar_SDL_N.csv');

  console.log('Importing SanMar catalog from SDL', { sdlPath });

  const result = await importSanmarCatalog({ sdlPath, dryRun: process.env.DRY_RUN === 'true' });
  console.log('SanMar catalog import complete', result);
}

main().catch((error) => {
  console.error('SanMar catalog import failed', error);
  process.exitCode = 1;
});
