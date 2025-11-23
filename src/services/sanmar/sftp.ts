import { mkdir } from 'fs/promises';
import path from 'path';
import SftpClient from 'ssh2-sftp-client';

export interface SanmarSftpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remoteDir?: string;
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function getSanmarSftpConfig(): SanmarSftpConfig {
  const host = requireEnv('SANMAR_FTP_HOST', process.env.SANMAR_FTP_SERVER ?? process.env.SANMAR_FTP_URL);
  const port = Number.parseInt(process.env.SANMAR_FTP_PORT ?? '2200', 10);
  const username = requireEnv('SANMAR_FTP_USERNAME');
  const password = requireEnv('SANMAR_FTP_PASSWORD');
  const remoteDir = process.env.SANMAR_FTP_REMOTE_DIR ?? 'SanMarPDD';

  return { host, port, username, password, remoteDir };
}

export interface DownloadOptions {
  files: string[];
  targetDir: string;
  overwrite?: boolean;
}

export async function downloadSanmarFiles(options: DownloadOptions, config = getSanmarSftpConfig()): Promise<string[]> {
  const client = new SftpClient();
  const downloaded: string[] = [];

  await mkdir(options.targetDir, { recursive: true });

  try {
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    });

    const remoteBase = config.remoteDir?.length ? `${config.remoteDir}`.replace(/\/+$/u, '') : '';
    const fastGetOptions = { concurrency: 4 };

    for (const file of options.files) {
      // Try multiple path variations
      const pathVariations = [
        remoteBase ? `${remoteBase}/${file}` : file,
        remoteBase ? `/${remoteBase}/${file}` : `/${file}`,
        file, // Just the filename
        `/${file}`, // Root with filename
      ];

      const localPath = path.join(options.targetDir, path.basename(file));
      let downloadedSuccessfully = false;

      if (!options.overwrite && downloaded.includes(localPath)) {
        continue;
      }

      for (const remotePath of pathVariations) {
        try {
          await client.fastGet(remotePath, localPath, fastGetOptions);
          downloaded.push(localPath);
          downloadedSuccessfully = true;
          console.log(`   ✅ Downloaded: ${remotePath} -> ${localPath}`);
          break; // Success, move to next file
        } catch (error) {
          // Try next path variation
          continue;
        }
      }

      if (!downloadedSuccessfully) {
        // List directory to help debug
        try {
          const dirContents = await client.list(remoteBase || '/');
          const fileNames = dirContents.map((f) => f.name).join(', ');
          throw new Error(
            `Failed to download ${file}. Tried paths: ${pathVariations.join(', ')}. ` +
            `Files in ${remoteBase || 'root'}: ${fileNames || 'none'}`
          );
        } catch (listError) {
          throw new Error(
            `Failed to download ${file}. Tried paths: ${pathVariations.join(', ')}. ` +
            `Also failed to list directory: ${listError instanceof Error ? listError.message : String(listError)}`
          );
        }
      }

      downloaded.push(localPath);
    }
  } finally {
    client.end().catch((error) => {
      console.warn('Failed to close SFTP connection', error);
    });
  }

  return downloaded;
}
