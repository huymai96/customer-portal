export type InventoryQty = {
  qty: number;
  backorderDate?: string;
};

export interface ProductInventoryWarehouse {
  warehouseId: string;
  quantity: number;
}

export interface ProductInventorySummary {
  colorCode: string;
  sizeCode: string;
  totalQty: number;
  fetchedAt: string;
  warehouses?: ProductInventoryWarehouse[];
}

export interface ProductColorway {
  colorCode: string;
  colorName: string;
  supplierVariantId?: string | null;
  swatchUrl?: string | null;
}

export interface ProductSize {
  code: string;
  display: string;
  sort: number;
}

export interface ProductMediaGroup {
  colorCode: string;
  urls: string[];
}

export interface ProductSkuMapEntry {
  supplierPartId: string;
  colorCode: string;
  sizeCode: string;
  supplierSku?: string | null;
}

export interface ProductRecord {
  id: string;
  supplierPartId: string;
  name: string;
  brand: string;
  defaultColor: string;
  colors: ProductColorway[];
  sizes: ProductSize[];
  media: ProductMediaGroup[];
  skuMap: ProductSkuMapEntry[];
  description?: string[];
  attributes?: Record<string, unknown>;
  inventory?: ProductInventorySummary[];
}

export type InventorySnapshot = {
  bySize: Record<string, InventoryQty>;
  fetchedAt: string;
  cacheStatus?: 'hit' | 'refreshed' | 'stale';
};

export type DecorationMethod = 'screen' | 'emb' | 'dtf' | 'heat' | 'dtg' | 'sublimation' | 'patch';

export type DecorationArtworkType = 'design' | 'proof' | 'reference' | 'other';

export interface DecorationArtwork {
  type: DecorationArtworkType;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface DecorationLocation {
  name: string;
  widthIn?: number;
  heightIn?: number;
  placementNotes?: string;
}

export interface DecorationSpec {
  method: DecorationMethod;
  locations: DecorationLocation[];
  notes?: string;
  colors?: number;
  underbase?: boolean;
  stitchCount?: number;
  threadPalette?: string[];
}

export interface CartLine {
  supplierPartId: string;
  colorCode: string;
  sizeCode: string;
  qty: number;
  decoration?: DecorationSpec | null;
  supplierSku?: string | null;
}

export interface DecorationOrderLineInput {
  supplierPartId: string;
  colorCode: string;
  sizeCode: string;
  quantity: number;
  metadata?: Record<string, unknown>;
}

export interface DecorationOrderRequest {
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  lines?: DecorationOrderLineInput[];
  decorations?: Array<
    DecorationSpec & {
      lineIndex?: number;
      proofRequired?: boolean;
      metadata?: Record<string, unknown>;
      artworks?: DecorationArtwork[];
    }
  >;
  artworks?: DecorationArtwork[];
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface ShippingAddress {
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface QuoteRequest {
  lines: CartLine[];
  customerInfo?: ContactInfo;
  shipTo?: ShippingAddress;
  needBy?: string;
  notes?: string;
  proofRequested?: boolean;
}

export interface QuoteLinePricing {
  unitBlankCost: number;
  unitDecorationCost: number;
  unitSetupCost: number;
  unitMarkup: number;
  unitPrice: number;
  extendedPrice: number;
  setupFeeTotal: number;
  notes: string[];
}

export interface QuoteLineResponse extends CartLine {
  pricing: QuoteLinePricing;
}

export interface QuoteResponse {
  quoteId: string;
  subtotal: number;
  lines: QuoteLineResponse[];
  customerInfo?: ContactInfo | null;
  shipTo?: ShippingAddress | null;
  needBy?: string | null;
  notes?: string | null;
  proofRequested?: boolean;
}



export interface PortalAccessRequestRecord {
  id: string;
  email: string;
  full_name: string;
  company?: string | null;
  status?: string | null;
  manager_email?: string | null;
  notes?: string | null;
  approval_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  approved_at?: string | null;
}
