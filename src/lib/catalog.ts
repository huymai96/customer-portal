import type { SupplierCode } from '@/lib/types';

export interface WarehouseInventory {
  warehouseName: string;
  onHand: number;
}

export interface SupplierInventory {
  supplier: SupplierCode;
  supplierSku: string;
  inventoryByWarehouse: WarehouseInventory[];
}

export interface CatalogProduct {
  styleCode: string;
  brand: string;
  name: string;
  defaultImageUrl: string;
  categories: string[];
  description?: string;
  suppliers: SupplierInventory[];
}

const CATALOG: CatalogProduct[] = [
  {
    styleCode: 'PC43',
    brand: 'Port & Company',
    name: 'Core Cotton Pocket Tee',
    defaultImageUrl: 'https://cdn.sanmar.com/catalog/images/pc43_white_front.jpg',
    categories: ['t-shirts', 'workwear'],
    description:
      'Everyday cotton pocket tee with sturdy seams and a ready-for-printing blank canvas.',
    suppliers: [
      {
        supplier: 'SANMAR',
        supplierSku: 'PC43',
        inventoryByWarehouse: [
          { warehouseName: 'Seattle, WA', onHand: 620 },
          { warehouseName: 'Hebron, KY', onHand: 420 },
          { warehouseName: 'Reno, NV', onHand: 180 },
        ],
      },
    ],
  },
  {
    styleCode: 'PC450',
    brand: 'Port & Company',
    name: 'Fan Favorite Blend Tee',
    defaultImageUrl: 'https://cdn.sanmar.com/catalog/images/pc450_silver_front.jpg',
    categories: ['t-shirts'],
    description: 'Ultra-soft blend tee that prints beautifully for campus and promo programs.',
    suppliers: [
      {
        supplier: 'SANMAR',
        supplierSku: 'PC450',
        inventoryByWarehouse: [
          { warehouseName: 'Dallas, TX', onHand: 510 },
          { warehouseName: 'Stockton, CA', onHand: 275 },
          { warehouseName: 'Maple Grove, MN', onHand: 190 },
        ],
      },
    ],
  },
  {
    styleCode: 'PC450LS',
    brand: 'Port & Company',
    name: 'Fan Favorite Blend Long Sleeve Tee',
    defaultImageUrl: 'https://cdn.sanmar.com/catalog/images/pc450ls_charcoal_front.jpg',
    categories: ['t-shirts', 'fleece'],
    description: 'Lightweight layering tee with the same hand-feel as the short sleeve favorite.',
    suppliers: [
      {
        supplier: 'SANMAR',
        supplierSku: 'PC450LS',
        inventoryByWarehouse: [
          { warehouseName: 'Reno, NV', onHand: 240 },
          { warehouseName: 'Hebron, KY', onHand: 320 },
        ],
      },
    ],
  },
  {
    styleCode: '5000',
    brand: 'Gildan',
    name: 'Heavy Cotton Tee',
    defaultImageUrl: 'https://cdn.ssactivewear.com/img/5000_front.jpg',
    categories: ['t-shirts'],
    description:
      'Promo workhorse tee with sturdy construction and broad color range favored for screen print.',
    suppliers: [
      {
        supplier: 'SANMAR',
        supplierSku: 'G500',
        inventoryByWarehouse: [
          { warehouseName: 'Seattle, WA', onHand: 980 },
          { warehouseName: 'Dallas, TX', onHand: 860 },
          { warehouseName: 'Stockton, CA', onHand: 430 },
        ],
      },
      {
        supplier: 'SSACTIVEWEAR',
        supplierSku: '5000',
        inventoryByWarehouse: [
          { warehouseName: 'Chicago, IL', onHand: 1040 },
          { warehouseName: 'Phoenix, AZ', onHand: 520 },
          { warehouseName: 'Atlanta, GA', onHand: 610 },
        ],
      },
    ],
  },
  {
    styleCode: '64000',
    brand: 'Gildan',
    name: 'Softstyle Tee',
    defaultImageUrl: 'https://cdn.ssactivewear.com/img/64000_front.jpg',
    categories: ['t-shirts', 'fashion'],
    description: 'Ringspun option for elevated programs that still rely on deep inventory.',
    suppliers: [
      {
        supplier: 'SSACTIVEWEAR',
        supplierSku: '64000',
        inventoryByWarehouse: [
          { warehouseName: 'Chicago, IL', onHand: 450 },
          { warehouseName: 'Fort Worth, TX', onHand: 300 },
        ],
      },
    ],
  },
];

export function listCatalog(): CatalogProduct[] {
  return CATALOG;
}

export function getProductByStyleCode(styleCode: string): CatalogProduct | undefined {
  const normalized = styleCode.trim().toUpperCase();
  return CATALOG.find((product) => product.styleCode.toUpperCase() === normalized);
}

export function getFeaturedProducts(limit = 4): CatalogProduct[] {
  return CATALOG.slice(0, limit);
}
