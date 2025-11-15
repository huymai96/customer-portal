import { Prisma, PrismaClient, SupplierSource } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type DbClient = PrismaClient | Prisma.TransactionClient;

type CanonicalStyleWithLinks = Prisma.CanonicalStyleGetPayload<{
  include: { supplierLinks: true };
}>;

export type SupplierProductLinkWithCanonical = Prisma.SupplierProductLinkGetPayload<{
  include: {
    canonicalStyle: {
      include: { supplierLinks: true };
    };
  };
}>;

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeDisplayName(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export interface EnsureCanonicalStyleLinkParams {
  supplier: SupplierSource;
  supplierPartId: string;
  styleNumber?: string;
  displayName?: string;
  brand?: string | null;
  metadata?: Record<string, unknown>;
}

export async function ensureCanonicalStyleLink(
  client: DbClient = prisma,
  params: EnsureCanonicalStyleLinkParams
): Promise<{ canonicalStyle: CanonicalStyleWithLinks; link: SupplierProductLinkWithCanonical }> {
  const supplierPartId = normalizeCode(params.supplierPartId);
  const styleNumber = normalizeCode(params.styleNumber ?? params.supplierPartId);
  const displayName = normalizeDisplayName(params.displayName) ?? supplierPartId;
  const brand = normalizeDisplayName(params.brand ?? undefined) ?? null;

  const canonicalStyle = await client.canonicalStyle.upsert({
    where: { styleNumber },
    update: {
      displayName,
      brand: brand ?? undefined,
    },
    create: {
      styleNumber,
      displayName,
      brand,
    },
    include: {
      supplierLinks: true,
    },
  });

  const link = await client.supplierProductLink.upsert({
    where: {
      supplier_supplierPartId: {
        supplier: params.supplier,
        supplierPartId,
      },
    },
    update: {
      canonicalStyleId: canonicalStyle.id,
      metadata: params.metadata ? (params.metadata as Prisma.JsonObject) : undefined,
    },
    create: {
      canonicalStyleId: canonicalStyle.id,
      supplier: params.supplier,
      supplierPartId,
      metadata: params.metadata ? (params.metadata as Prisma.JsonObject) : undefined,
    },
    include: {
      canonicalStyle: {
        include: { supplierLinks: true },
      },
    },
  });

  return { canonicalStyle: link.canonicalStyle, link };
}

interface GuessStyleInput {
  supplier: SupplierSource;
  supplierPartId: string;
  brand?: string;
  metadata?: Record<string, unknown>;
}

export function guessCanonicalStyleNumber(input: GuessStyleInput): string {
  const part = normalizeCode(input.supplierPartId);
  const brandPrefix = input.brand ? normalizeDisplayName(input.brand) : undefined;

  if (/^[A-Z]?\d{4,}$/u.test(part)) {
    const parsed = part.replace(/^[A-Z]/u, '');
    return parsed;
  }

  if (brandPrefix) {
    const pattern = part.replace(/[^A-Z0-9]/gu, '');
    return `${brandPrefix.replace(/\s+/gu, '').slice(0, 3)}-${pattern || part}`;
  }

  return part;
}

export async function getSupplierLinkWithCanonical(
  supplier: SupplierSource,
  supplierPartId: string,
  client: DbClient = prisma
): Promise<SupplierProductLinkWithCanonical | null> {
  return client.supplierProductLink.findUnique({
    where: {
      supplier_supplierPartId: {
        supplier,
        supplierPartId: normalizeCode(supplierPartId),
      },
    },
    include: {
      canonicalStyle: {
        include: { supplierLinks: true },
      },
    },
  });
}

export async function listSupplierLinksForStyle(
  canonicalStyleId: string,
  client: DbClient = prisma
): Promise<SupplierProductLinkWithCanonical[]> {
  return client.supplierProductLink.findMany({
    where: { canonicalStyleId },
    include: {
      canonicalStyle: {
        include: { supplierLinks: true },
      },
    },
    orderBy: { supplierPartId: 'asc' },
  });
}

export async function getCanonicalStyleByStyleNumber(
  styleNumber: string,
  client: DbClient = prisma
): Promise<CanonicalStyleWithLinks | null> {
  return client.canonicalStyle.findUnique({
    where: { styleNumber: normalizeCode(styleNumber) },
    include: { supplierLinks: true },
  });
}

export async function getCanonicalStyleForSupplierPart(
  supplier: SupplierSource,
  supplierPartId: string,
  client: DbClient = prisma
): Promise<CanonicalStyleWithLinks | null> {
  return client.canonicalStyle.findFirst({
    where: {
      supplierLinks: {
        some: {
          supplier,
          supplierPartId: normalizeCode(supplierPartId),
        },
      },
    },
    include: { supplierLinks: true },
  });
}

export async function getCanonicalStyleByAnySupplierPart(
  supplierPartId: string,
  client: DbClient = prisma
): Promise<CanonicalStyleWithLinks | null> {
  return client.canonicalStyle.findFirst({
    where: {
      supplierLinks: {
        some: {
          supplierPartId: normalizeCode(supplierPartId),
        },
      },
    },
    include: { supplierLinks: true },
  });
}

export async function countCanonicalStyles(client: DbClient = prisma): Promise<number> {
  return client.canonicalStyle.count();
}

export async function countSupplierProductLinks(client: DbClient = prisma): Promise<number> {
  return client.supplierProductLink.count();
}

