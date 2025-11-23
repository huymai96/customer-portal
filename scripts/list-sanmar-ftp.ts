#!/usr/bin/env tsx
/**
 * List files on SanMar FTP server
 * 
 * Usage:
 *   npx tsx scripts/list-sanmar-ftp.ts
 */

import 'tsconfig-paths/register';
import path from 'path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import SftpClient from 'ssh2-sftp-client';
import { getSanmarSftpConfig } from '../src/services/sanmar/sftp';

async function main() {
  const config = getSanmarSftpConfig();
  const client = new SftpClient();

  console.log('\n🔍 Connecting to SanMar FTP...');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Username: ${config.username}`);
  console.log(`   Remote Dir: ${config.remoteDir}\n`);

  try {
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    });

    console.log('✅ Connected successfully\n');

    // List root directory
    console.log('📁 Root directory contents:');
    const rootFiles = await client.list('/');
    for (const file of rootFiles) {
      const type = file.type === 'd' ? '📁' : '📄';
      const size = file.type === 'd' ? '' : ` (${file.size} bytes)`;
      console.log(`   ${type} ${file.name}${size}`);
    }

    // List SanmarPDD directory if it exists
    const remoteDir = config.remoteDir || 'SanmarPDD';
    console.log(`\n📁 ${remoteDir} directory contents:`);
    try {
      const pddFiles = await client.list(`/${remoteDir}`);
      for (const file of pddFiles) {
        const type = file.type === 'd' ? '📁' : '📄';
        const size = file.type === 'd' ? '' : ` (${file.size} bytes)`;
        const modified = file.modifyTime ? ` - Modified: ${file.modifyTime}` : '';
        console.log(`   ${type} ${file.name}${size}${modified}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Directory ${remoteDir} not found or inaccessible`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Try alternative directory names
    const altDirs = ['SanmarPDD', 'SanMarPDD', 'PDD', 'sanmar', 'SanMar'];
    for (const altDir of altDirs) {
      if (altDir === remoteDir) continue;
      try {
        console.log(`\n📁 Checking ${altDir} directory:`);
        const altFiles = await client.list(`/${altDir}`);
        if (altFiles.length > 0) {
          for (const file of altFiles) {
            const type = file.type === 'd' ? '📁' : '📄';
            const size = file.type === 'd' ? '' : ` (${file.size} bytes)`;
            console.log(`   ${type} ${file.name}${size}`);
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

  } catch (error) {
    console.error('\n❌ Failed to connect or list files:', error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {
      // Ignore close errors
    });
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exitCode = 1;
});


