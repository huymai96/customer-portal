import path from 'path';
import { config } from 'dotenv';

const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  config({ path: envPath, override: false });
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const styleNumber = (process.argv[2] ?? 'PC43').toUpperCase();
  const style = await prisma.canonicalStyle.findUnique({
    where: { styleNumber },
    include: { supplierLinks: true },
  });

  console.log(JSON.stringify(style, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

