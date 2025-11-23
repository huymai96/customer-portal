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
  const supplierPartId = (process.argv[2] ?? 'PC43').toUpperCase();
  const inventory = await prisma.productInventory.findMany({
    where: { supplierPartId },
    orderBy: [{ colorCode: 'asc' }, { sizeCode: 'asc' }],
  });

  console.log(JSON.stringify(inventory, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

