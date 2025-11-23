import { mkdir } from "fs/promises";
import path from "path";
import { config } from "dotenv";

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { downloadSanmarFiles, getSanmarSftpConfig } from "../src/services/sanmar/sftp";

const DEFAULT_FILES = (process.env.SANMAR_FTP_FILES ?? 'SanMar_SDL_N.csv,SanMar_EPDD.csv,sanmar_dip.txt')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

async function main() {
  const targetDir = path.resolve(process.env.SANMAR_FTP_TARGET_DIR ?? 'tmp/sanmar');
  await mkdir(targetDir, { recursive: true });

  const config = getSanmarSftpConfig();
  console.log('Connecting to SanMar SFTP', {
    host: config.host,
    port: config.port,
    remoteDir: config.remoteDir,
    targetDir,
    files: DEFAULT_FILES,
  });

  const downloaded = await downloadSanmarFiles({ files: DEFAULT_FILES, targetDir, overwrite: true }, config);
  console.log('Downloaded files', downloaded);
}

main().catch((error) => {
  console.error('SanMar FTP download failed', error);
  process.exitCode = 1;
});