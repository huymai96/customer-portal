import { Prisma } from '@prisma/client';
import type {
  ArtworkAsset,
  ArtworkAssetType,
  DecorationMethod as PrismaDecorationMethod,
  Order,
  OrderDecoration,
  OrderLine,
} from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type DecorationMethodInput = PrismaDecorationMethod | string;
export type ArtworkTypeInput = ArtworkAssetType | string;

export interface CreateArtworkInput {
  type: ArtworkTypeInput;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface CreateDecorationInput {
  lineIndex?: number;
  method: DecorationMethodInput;
  location?: string;
  colors?: number;
  notes?: string;
  proofRequired?: boolean;
  metadata?: Record<string, unknown>;
  artworks?: CreateArtworkInput[];
}

export interface CreateOrderLineInput {
  supplierPartId: string;
  colorCode: string;
  sizeCode: string;
  quantity: number;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderInput {
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  lines?: CreateOrderLineInput[];
  decorations?: CreateDecorationInput[];
  artworks?: CreateArtworkInput[];
}

type OrderWithRelations = Order & {
  lines: (OrderLine & { decorations: OrderDecoration[] })[];
  decorations: (OrderDecoration & { artworks: ArtworkAsset[]; line: OrderLine | null })[];
  artworks: ArtworkAsset[];
};

const DECORATION_METHOD_ALIASES: Record<string, PrismaDecorationMethod> = {
  screen: 'SCREEN',
  screenprint: 'SCREEN',
  silk: 'SCREEN',
  emb: 'EMB',
  embroidery: 'EMB',
  dtf: 'DTF',
  'direct-to-film': 'DTF',
  heat: 'HEAT',
  'heat-transfer': 'HEAT',
  dtg: 'DTG',
  'direct-to-garment': 'DTG',
  sublimation: 'SUBLIMATION',
  patch: 'PATCH',
};

const ARTWORK_TYPE_ALIASES: Record<string, ArtworkAssetType> = {
  design: 'DESIGN',
  art: 'DESIGN',
  proof: 'PROOF',
  approval: 'PROOF',
  reference: 'REFERENCE',
  mockup: 'REFERENCE',
  other: 'OTHER',
};

function normalizeDecorationMethod(method: DecorationMethodInput): PrismaDecorationMethod {
  if (!method) {
    throw new Error('Decoration method is required');
  }

  if (typeof method !== 'string') {
    return method;
  }

  const key = method.trim().toLowerCase();
  const mapped = DECORATION_METHOD_ALIASES[key];
  if (!mapped) {
    throw new Error(`Unsupported decoration method: ${method}`);
  }
  return mapped;
}

function normalizeArtworkType(type: ArtworkTypeInput): ArtworkAssetType {
  if (!type) {
    throw new Error('Artwork type is required');
  }

  if (typeof type !== 'string') {
    return type;
  }

  const key = type.trim().toLowerCase();
  const mapped = ARTWORK_TYPE_ALIASES[key];
  if (!mapped) {
    throw new Error(`Unsupported artwork asset type: ${type}`);
  }
  return mapped;
}

function assertValue<T>(value: T, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

function sanitizeIdentifier(value: string, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed.toUpperCase();
}

function sanitizeQuantity(value: number, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return Math.floor(parsed);
}

function toJsonValue(value?: unknown): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  if (value == null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

export async function createDraftOrder(input: CreateOrderInput): Promise<OrderWithRelations> {
  const linesInput = input.lines ?? [];
  const decorationsInput = input.decorations ?? [];
  const orderArtworksInput = input.artworks ?? [];

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        customerName: input.customerName?.trim() || null,
        customerEmail: input.customerEmail?.trim().toLowerCase() || null,
        customerCompany: input.customerCompany?.trim() || null,
        notes: input.notes?.trim() || null,
        metadata: toJsonValue(input.metadata),
      },
    });

    const createdLines: OrderLine[] = [];
    for (const [index, line] of linesInput.entries()) {
      const supplierPartId = sanitizeIdentifier(line.supplierPartId, `Line ${index + 1} supplierPartId`);
      const colorCode = sanitizeIdentifier(line.colorCode, `Line ${index + 1} colorCode`);
      const sizeCode = sanitizeIdentifier(line.sizeCode, `Line ${index + 1} sizeCode`);
      const quantity = sanitizeQuantity(line.quantity, `Line ${index + 1} quantity`);

      const created = await tx.orderLine.create({
        data: {
          orderId: order.id,
          supplierPartId,
          colorCode,
          sizeCode,
          quantity,
          metadata: toJsonValue(line.metadata),
        },
      });
      createdLines.push(created);
    }

    const createdDecorations: OrderDecoration[] = [];
    for (const [index, decoration] of decorationsInput.entries()) {
      const method = normalizeDecorationMethod(decoration.method);
      let orderLineId: string | undefined;
      if (typeof decoration.lineIndex === 'number') {
        const referencedLine = createdLines[decoration.lineIndex];
        assertValue(referencedLine, `Decoration ${index + 1} references an invalid lineIndex`);
        orderLineId = referencedLine.id;
      }

      const created = await tx.orderDecoration.create({
        data: {
          orderId: order.id,
          orderLineId,
          method,
          location: decoration.location?.trim() || null,
          colors: decoration.colors ?? null,
          notes: decoration.notes?.trim() || null,
          proofRequired: decoration.proofRequired ?? true,
          metadata: toJsonValue(decoration.metadata),
        },
      });
      createdDecorations.push(created);

      for (const artwork of decoration.artworks ?? []) {
        const artworkType = normalizeArtworkType(artwork.type);
        await tx.artworkAsset.create({
          data: {
            orderId: order.id,
            orderDecorationId: created.id,
            type: artworkType,
            url: artwork.url,
            metadata: toJsonValue(artwork.metadata),
          },
        });
      }
    }

    for (const artwork of orderArtworksInput) {
      const artworkType = normalizeArtworkType(artwork.type);
      await tx.artworkAsset.create({
        data: {
          orderId: order.id,
          type: artworkType,
          url: artwork.url,
          metadata: toJsonValue(artwork.metadata),
        },
      });
    }

    const summary = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        lines: {
          include: {
            decorations: true,
          },
        },
        decorations: {
          include: {
            artworks: true,
            line: true,
          },
        },
        artworks: true,
      },
    });

    assertValue(summary, 'Failed to load newly created order');
    return summary;
  });
}
