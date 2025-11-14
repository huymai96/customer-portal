import type { InventorySnapshot, ProductRecord } from '@/lib/types';

interface ColorInventory {
  colorCode: string;
  bySize: Record<string, { qty: number; backorderDate?: string }>;
}

interface CatalogEntry {
  product: ProductRecord;
  baseBlankCost: number;
  inventory: ColorInventory[];
  keywords: string[];
}

const SIZES = [
  { code: 'XS', display: 'XS', sort: 0 },
  { code: 'S', display: 'Small', sort: 1 },
  { code: 'M', display: 'Medium', sort: 2 },
  { code: 'L', display: 'Large', sort: 3 },
  { code: 'XL', display: 'XL', sort: 4 },
  { code: '2XL', display: '2XL', sort: 5 },
];

const buildSkuMap = (supplierPartId: string, colors: string[]) => {
  const entries: ProductRecord['skuMap'] = [];
  for (const colorCode of colors) {
    for (const size of SIZES) {
      entries.push({
        supplierPartId,
        colorCode,
        sizeCode: size.code,
        supplierSku: `${supplierPartId}-${colorCode}-${size.code}`,
      });
    }
  }
  return entries;
};

const catalog: CatalogEntry[] = [
  {
    product: {
      id: 'pc54-core-cotton-tee',
      supplierPartId: 'PC54',
      name: 'Port & Company® Core Cotton Tee',
      brand: 'Port & Company',
      defaultColor: 'BLK',
      colors: [
        { colorCode: 'BLK', colorName: 'Black' },
        { colorCode: 'NVY', colorName: 'Navy' },
        { colorCode: 'RYL', colorName: 'Royal' },
      ],
      sizes: SIZES,
      media: [
        {
          colorCode: 'BLK',
          urls: [
            'https://images.promosink.com/sanmar/pc54/pc54_black_front.jpg',
            'https://images.promosink.com/sanmar/pc54/pc54_black_back.jpg',
          ],
        },
        {
          colorCode: 'NVY',
          urls: [
            'https://images.promosink.com/sanmar/pc54/pc54_navy_front.jpg',
            'https://images.promosink.com/sanmar/pc54/pc54_navy_back.jpg',
          ],
        },
        {
          colorCode: 'RYL',
          urls: [
            'https://images.promosink.com/sanmar/pc54/pc54_royal_front.jpg',
            'https://images.promosink.com/sanmar/pc54/pc54_royal_back.jpg',
          ],
        },
      ],
      skuMap: buildSkuMap('PC54', ['BLK', 'NVY', 'RYL']),
      description: [
        '5.4-ounce, 100% cotton (90/10 cotton/poly for Athletic Heather).',
        'Removable tag for comfort and relabeling.',
        'Shoulder-to-shoulder taping.',
      ],
      attributes: {
        fabric: '100% cotton',
        gender: 'Unisex',
        weight: '5.4 oz',
      },
    },
    baseBlankCost: 4.1,
    inventory: [
      {
        colorCode: 'BLK',
        bySize: {
          XS: { qty: 96 },
          S: { qty: 160 },
          M: { qty: 212 },
          L: { qty: 180 },
          XL: { qty: 140 },
          '2XL': { qty: 75 },
        },
      },
      {
        colorCode: 'NVY',
        bySize: {
          XS: { qty: 48 },
          S: { qty: 120 },
          M: { qty: 180 },
          L: { qty: 150 },
          XL: { qty: 120 },
          '2XL': { qty: 60, backorderDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() },
        },
      },
      {
        colorCode: 'RYL',
        bySize: {
          XS: { qty: 30 },
          S: { qty: 60 },
          M: { qty: 90 },
          L: { qty: 120 },
          XL: { qty: 110 },
          '2XL': { qty: 55 },
        },
      },
    ],
    keywords: ['tee', 't-shirt', 'cotton', 'pc54', 'pc-54', 'shirts'],
  },
  {
    product: {
      id: 'ln100-ladies-perf-hoodie',
      supplierPartId: 'LN100',
      name: 'Ladies Performance Hoodie',
      brand: 'Luxe North',
      defaultColor: 'HGR',
      colors: [
        { colorCode: 'HGR', colorName: 'Heather Gray' },
        { colorCode: 'BLU', colorName: 'Sky Blue' },
      ],
      sizes: SIZES,
      media: [
        {
          colorCode: 'HGR',
          urls: [
            'https://images.promosink.com/luxenorth/ln100/ln100_heather_front.jpg',
            'https://images.promosink.com/luxenorth/ln100/ln100_heather_detail.jpg',
          ],
        },
        {
          colorCode: 'BLU',
          urls: [
            'https://images.promosink.com/luxenorth/ln100/ln100_blue_front.jpg',
            'https://images.promosink.com/luxenorth/ln100/ln100_blue_detail.jpg',
          ],
        },
      ],
      skuMap: buildSkuMap('LN100', ['HGR', 'BLU']),
      description: [
        'Moisture-wicking fabric keeps you cool and dry.',
        'Three-panel hood with dyed-to-match drawcords.',
        'Thumbholes at cuffs for added comfort.',
      ],
      attributes: {
        fabric: '92% polyester / 8% spandex',
        gender: 'Ladies',
        weight: '7.2 oz',
      },
    },
    baseBlankCost: 12.75,
    inventory: [
      {
        colorCode: 'HGR',
        bySize: {
          XS: { qty: 40 },
          S: { qty: 80 },
          M: { qty: 105 },
          L: { qty: 90 },
          XL: { qty: 70 },
          '2XL': { qty: 30 },
        },
      },
      {
        colorCode: 'BLU',
        bySize: {
          XS: { qty: 22 },
          S: { qty: 55 },
          M: { qty: 84 },
          L: { qty: 70 },
          XL: { qty: 48 },
          '2XL': { qty: 18 },
        },
      },
    ],
    keywords: ['hoodie', 'performance', 'ladies', 'ln100', 'outerwear'],
  },
  {
    product: {
      id: 'cs410-trucker-cap',
      supplierPartId: 'CS410',
      name: 'CornerStone® Mesh Back Trucker Cap',
      brand: 'CornerStone',
      defaultColor: 'BLK',
      colors: [
        { colorCode: 'BLK', colorName: 'Black' },
        { colorCode: 'NVY', colorName: 'Navy' },
        { colorCode: 'GRY', colorName: 'Charcoal' },
      ],
      sizes: [{ code: 'OSFA', display: 'One Size', sort: 0 }],
      media: [
        {
          colorCode: 'BLK',
          urls: [
            'https://images.promosink.com/cornerstone/cs410/cs410_black_front.jpg',
            'https://images.promosink.com/cornerstone/cs410/cs410_black_detail.jpg',
          ],
        },
        {
          colorCode: 'NVY',
          urls: ['https://images.promosink.com/cornerstone/cs410/cs410_navy_front.jpg'],
        },
        {
          colorCode: 'GRY',
          urls: ['https://images.promosink.com/cornerstone/cs410/cs410_charcoal_front.jpg'],
        },
      ],
      skuMap: buildSkuMap('CS410', ['BLK', 'NVY', 'GRY']),
      description: [
        'Cotton twill front with polyester mesh back panels.',
        'Mid-profile structured crown with snapback closure.',
        'Decoration-friendly surface for embroidery and patches.',
      ],
      attributes: {
        fabric: 'Cotton/poly blend',
        closure: 'Snapback',
        gender: 'Unisex',
      },
    },
    baseBlankCost: 7.95,
    inventory: [
      {
        colorCode: 'BLK',
        bySize: {
          OSFA: { qty: 260 },
        },
      },
      {
        colorCode: 'NVY',
        bySize: {
          OSFA: { qty: 185 },
        },
      },
      {
        colorCode: 'GRY',
        bySize: {
          OSFA: { qty: 205 },
        },
      },
    ],
    keywords: ['cs410', 'cap', 'hat', 'trucker', 'headwear'],
  },
];

export function listProducts(): ProductRecord[] {
  return catalog.map((entry) => structuredClone(entry.product));
}

export function searchCatalog(query: string) {
  const q = query.toLowerCase();
  return catalog
    .filter((entry) => {
      const product = entry.product;
      return (
        product.supplierPartId.toLowerCase().includes(q) ||
        product.name.toLowerCase().includes(q) ||
        product.brand.toLowerCase().includes(q) ||
        entry.keywords.some((keyword) => keyword.includes(q))
      );
    })
    .map((entry) => ({
      supplierPartId: entry.product.supplierPartId,
      name: entry.product.name,
      brand: entry.product.brand,
    }));
}

export function getProductBySupplierPartId(partId: string): ProductRecord | null {
  const entry = catalog.find(
    (candidate) => candidate.product.supplierPartId.toUpperCase() === partId.toUpperCase()
  );
  if (!entry) {
    return null;
  }
  return structuredClone(entry.product);
}

export function getProductBaseBlankCost(partId: string): number | null {
  const entry = catalog.find(
    (candidate) => candidate.product.supplierPartId.toUpperCase() === partId.toUpperCase()
  );
  return entry?.baseBlankCost ?? null;
}

export function getInventorySnapshot(
  partId: string,
  colorCode: string
): InventorySnapshot | null {
  const entry = catalog.find(
    (candidate) => candidate.product.supplierPartId.toUpperCase() === partId.toUpperCase()
  );
  if (!entry) {
    return null;
  }
  const color = entry.inventory.find(
    (candidate) => candidate.colorCode.toUpperCase() === colorCode.toUpperCase()
  );
  if (!color) {
    return null;
  }
  return {
    bySize: structuredClone(color.bySize),
    fetchedAt: new Date().toISOString(),
    cacheStatus: 'hit',
  };
}

export function listCatalogSummaries() {
  return catalog.map((entry) => ({
    supplierPartId: entry.product.supplierPartId,
    name: entry.product.name,
    brand: entry.product.brand,
  }));
}
