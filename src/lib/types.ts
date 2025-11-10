export interface ProductRecord {
  sku: string;
  supplier: string;
  brand: string;
  product_name: string;
  style_number?: string;
  category?: string;
  color?: string;
  size?: string;
  fabric_type?: string;
  wholesale_price?: number;
  supplier_sku?: string;
  dtg_compatible?: boolean;
  dtf_compatible?: boolean;
  screen_print_compatible?: boolean;
  embroidery_compatible?: boolean;
  decoration_methods?: {
    dtg?: boolean;
    dtf?: boolean;
    screen_print?: boolean;
    embroidery?: boolean;
  };
  inventory?: {
    available: number;
    in_stock: boolean;
    warehouses?: Array<{
      warehouse: string;
      label?: string;
      city?: string;
      state?: string;
      quantity: number;
      in_stock: boolean;
    }>;
  };
  image_url?: string;
}

export interface ProductsResponse {
  success: boolean;
  products: ProductRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface InventoryRecord {
  sku: string;
  product_name?: string;
  brand?: string;
  supplier?: string;
  available: number;
  in_stock: boolean;
  low_stock?: boolean;
  restock_date?: string | null;
  last_updated?: string | null;
}

export interface OrderSummary {
  order_id: string;
  order_number: string;
  external_id?: string | null;
  status: string;
  production_method: string | null;
  estimated_ship_date: string | null;
  actual_ship_date?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  created_at: string;
}

export interface OrdersResponse {
  success: boolean;
  orders: OrderSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface QuoteLocationInput {
  placement: string;
  artwork_url: string;
  width_inches?: number;
  height_inches?: number;
  colors?: number;
  stitch_count?: number;
  thread_colors?: string[];
}

export interface QuoteItemInput {
  sku: string;
  product_name: string;
  quantity: number;
  size?: string;
  color?: string;
  decoration: {
    method?: string;
    locations: QuoteLocationInput[];
  };
}

export interface QuoteRequestBody {
  items: QuoteItemInput[];
  shipping_method?: string;
  shipping_cost?: number;
  rush_hours?: number;
  finishing?: {
    folding_polybagging?: boolean;
    individual_stickers?: boolean;
  };
}

export interface QuoteResponseBody {
  success: boolean;
  pricing?: {
    items: Array<{
      sku: string;
      product_name: string;
      quantity: number;
      method: string;
      setup_fee: number;
      add_on_total: number;
      rush_fee: number;
      line_total: number;
    }>;
    summary: {
      currency: string;
      blank_total: number;
      decoration_total: number;
      subtotal: number;
      setup_total: number;
      add_on_total: number;
      rush_fee_total: number;
      shipping_total: number;
      tax_total: number;
      total: number;
    };
    warnings: string[];
  };
  routing?: {
    summary: {
      primary_method: string;
      destinations: string[];
      estimated_ship_date: string;
      dtg_items: number;
      dtf_items: number;
      screen_print_items: number;
      embroidery_items: number;
    };
  };
  error?: string;
  details?: string;
  savedQuote?: PortalQuoteRecord;
}

export interface PortalQuoteWarehouseAllocation {
  warehouse: string;
  quantity: number;
}

export interface PortalQuoteAdditionalFee {
  label: string;
  amount: number;
}

export interface PortalQuoteArtworkAsset {
  id?: string;
  filename?: string;
  url?: string;
  type?: string;
  notes?: string;
}

export interface PortalQuoteItem {
  supplier: string | null;
  supplier_label?: string;
  sku?: string;
  product_name?: string;
  color?: string;
  size?: string;
  quantity: number;
  base_cost: number;
  markup_percentage: number;
  markup_amount: number;
  unit_price: number;
  warehouse_allocations: PortalQuoteWarehouseAllocation[];
  decoration: {
    method?: string;
    notes?: string;
    unit_price: number;
    total: number;
  };
  additional_fees: PortalQuoteAdditionalFee[];
  artwork_assets: PortalQuoteArtworkAsset[];
  pricing: {
    blank_total: number;
    decoration_total: number;
    additional_fees_total: number;
    line_total: number;
  };
  metadata?: Record<string, unknown>;
}

export interface PortalQuotePricingSummary {
  blanks_total: number;
  decoration_total: number;
  additional_fees_total: number;
  subtotal: number;
  grand_total: number;
  supplier_breakdown: Record<string, { blanks: number; quantity: number }>;
}

export interface PortalQuotePricingItemSummary {
  supplier: string | null;
  sku?: string;
  quantity: number;
  unit_price: number;
  markup_percentage: number;
  markup_amount: number;
  blank_total: number;
  decoration_total: number;
  additional_fees_total: number;
  line_total: number;
}

export interface PortalQuotePricing {
  currency: string;
  summary: PortalQuotePricingSummary;
  items: PortalQuotePricingItemSummary[];
}

export interface PortalQuoteCustomerContext {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface PortalQuoteLogisticsAddress {
  name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface PortalQuoteLogistics {
  ship_to?: PortalQuoteLogisticsAddress;
  in_hand_date?: string;
  shipping_method?: string;
  customer_po?: string;
}

export interface PortalQuoteArtwork {
  files: PortalQuoteArtworkAsset[];
  notes?: string;
}

export interface PortalQuoteWorkflow {
  proof?: {
    status?: string;
    approved_at?: string;
    approved_by?: string;
    notes?: string;
  };
  status_notes?: string;
}

export interface PortalQuoteRecord {
  id: string;
  customer_id: string;
  quote_number: string;
  status: string;
  title?: string | null;
  notes?: string | null;
  items: PortalQuoteItem[];
  pricing?: PortalQuotePricing | null;
  routing?: Record<string, unknown> | null;
  total?: number | string | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
  customer_context?: PortalQuoteCustomerContext | null;
  logistics?: PortalQuoteLogistics | null;
  artwork?: PortalQuoteArtwork | null;
  workflow?: PortalQuoteWorkflow | null;
  submitted_at?: string | null;
  submitted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalQuotesResponse {
  success: boolean;
  quotes: PortalQuoteRecord[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface PortalAccessRequestRecord {
  id: string;
  customer_id: string;
  full_name: string;
  company?: string | null;
  email: string;
  manager_email: string;
  notes?: string | null;
  status: string;
  approval_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}


