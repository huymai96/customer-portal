/**
 * Decoration Pricing Calculator
 * 
 * Calculates costs for:
 * - Screen Printing (by colors and quantity)
 * - Embroidery (by stitches and quantity)
 * - Direct-To-Garment (DTG) (by garment type, size, and quantity)
 * - Setup Fees
 * - Extra Location Charges
 * - Fabric Charges
 * - Service Charges (Fold, Bag, Sticker)
 */

export type DecorationMethod = 'screen_print' | 'embroidery' | 'dtg';
export type GarmentColor = 'light' | 'dark';
export type DecorationLocation = 
  | 'front_chest' 
  | 'full_front' 
  | 'back' 
  | 'full_back'
  | 'left_sleeve' 
  | 'right_sleeve'
  | 'left_leg'
  | 'right_leg'
  | 'pocket'
  | 'heavy_bulky_bags';

export interface DecorationPricingInput {
  method: DecorationMethod;
  quantity: number;
  
  // Screen Print specific
  colors?: number;
  maxColors?: number;
  
  // Embroidery specific
  stitches?: number;
  
  // DTG specific
  garmentColor?: GarmentColor;
  printSizeCategory?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
  
  // Common
  locations?: DecorationLocation[];
  
  // Fabric/Service charges
  isWaterResistant?: boolean;
  isPolyBlend?: boolean;
  isNylonAcrylic?: boolean;
  needsFolding?: boolean;
  needsBagging?: boolean;
  needsSticker?: boolean;
}

export interface DecorationPricingResult {
  unitCost: number;
  setupFee: number;
  totalDecorationCost: number;
  extraLocationCharges: number;
  fabricCharges: number;
  serviceCharges: number;
  breakdown: {
    baseUnitCost: number;
    extraLocations: { location: DecorationLocation; charge: number }[];
    fabricCharge: number;
    serviceCharge: number;
  };
}

// ============================================
// PRICING TABLES (from screenshots)
// ============================================

/**
 * Screen Printing Pricing Matrix
 * Quantity ranges vs number of colors
 */
const SCREEN_PRINT_PRICING: Record<string, Record<number, number>> = {
  '12-29': { 1: 5.23, 2: 5.80, 3: 6.67, 4: 8.10, 5: 9.61, 6: 10.76, 7: 11.91, 8: 13.06, 9: 14.79, 10: 16.80, 11: 20.68, 12: 25.50 },
  '30-48': { 1: 4.35, 2: 5.07, 3: 5.79, 4: 6.50, 5: 7.22, 6: 7.94, 7: 8.66, 8: 9.38, 9: 10.10, 10: 10.82, 11: 11.54, 12: 12.25 },
  '49-71': { 1: 2.50, 2: 2.93, 3: 3.36, 4: 3.79, 5: 4.22, 6: 4.65, 7: 5.08, 8: 5.51, 9: 5.95, 10: 6.38, 11: 6.81, 12: 7.24 },
  '72-143': { 1: 2.08, 2: 2.52, 3: 2.95, 4: 3.38, 5: 3.81, 6: 4.24, 7: 4.67, 8: 5.10, 9: 5.53, 10: 5.97, 11: 6.40, 12: 6.83 },
  '144-299': { 1: 1.47, 2: 1.69, 3: 1.83, 4: 2.12, 5: 2.41, 6: 2.70, 7: 2.98, 8: 3.27, 9: 3.56, 10: 3.92, 11: 4.35, 12: 4.78 },
  '300-499': { 1: 1.36, 2: 1.57, 3: 1.72, 4: 2.01, 5: 2.29, 6: 2.58, 7: 2.87, 8: 3.16, 9: 3.44, 10: 3.80, 11: 4.23, 12: 4.66 },
  '500-999': { 1: 0.97, 2: 1.19, 3: 1.40, 4: 1.62, 5: 1.84, 6: 2.05, 7: 2.27, 8: 2.48, 9: 2.70, 10: 2.91, 11: 3.13, 12: 3.35 },
  '1000-2499': { 1: 0.95, 2: 1.16, 3: 1.38, 4: 1.60, 5: 1.81, 6: 2.03, 7: 2.24, 8: 2.46, 9: 2.67, 10: 2.89, 11: 3.10, 12: 3.32 },
  '2500-9999': { 1: 0.80, 2: 0.94, 3: 1.08, 4: 1.23, 5: 1.37, 6: 1.51, 7: 1.66, 8: 1.80, 9: 1.95, 10: 2.09, 11: 2.23, 12: 2.38 },
  '10000+': { 1: 0.65, 2: 0.79, 3: 0.86, 4: 0.94, 5: 1.01, 6: 1.15, 7: 1.29, 8: 1.37, 9: 1.58, 10: 1.80, 11: 2.01, 12: 2.23 },
};

/**
 * Embroidery Pricing Matrix
 * Quantity ranges vs stitch count ranges
 */
const EMBROIDERY_PRICING: Record<string, Record<string, number>> = {
  '1-11': { '1-4999': 5.25, '5000-6999': 5.65, '7000-7999': 6.00, '8000-8999': 6.24, '9000-9999': 6.48, '10000-10999': 6.72, '11000-11999': 6.96, '12000-12999': 7.20, '13000-13999': 7.44, '14000-14999': 7.68, '15000+': 7.92 },
  '12-29': { '1-4999': 4.77, '5000-6999': 5.06, '7000-7999': 5.06, '8000-8999': 5.64, '9000-9999': 5.64, '10000-10999': 6.44, '11000-11999': 6.44, '12000-12999': 6.84, '13000-13999': 7.25, '14000-14999': 7.65, '15000+': 8.05 },
  '30-47': { '1-4999': 4.77, '5000-6999': 5.06, '7000-7999': 5.06, '8000-8999': 5.64, '9000-9999': 5.64, '10000-10999': 6.44, '11000-11999': 6.44, '12000-12999': 6.84, '13000-13999': 7.25, '14000-14999': 7.65, '15000+': 8.05 },
  '48-143': { '1-4999': 3.91, '5000-6999': 4.20, '7000-7999': 4.20, '8000-8999': 4.77, '9000-9999': 4.77, '10000-10999': 5.35, '11000-11999': 5.35, '12000-12999': 5.75, '13000-13999': 6.15, '14000-14999': 6.56, '15000+': 6.96 },
  '144-499': { '1-4999': 3.39, '5000-6999': 4.77, '7000-7999': 4.77, '8000-8999': 4.26, '9000-9999': 4.26, '10000-10999': 4.83, '11000-11999': 4.83, '12000-12999': 5.23, '13000-13999': 5.64, '14000-14999': 6.04, '15000+': 6.44 },
  '500+': { '1-4999': 2.76, '5000-6999': 5.35, '7000-7999': 5.35, '8000-8999': 3.34, '9000-9999': 3.34, '10000-10999': 3.80, '11000-11999': 3.80, '12000-12999': 4.20, '13000-13999': 4.60, '14000-14999': 5.00, '15000+': 5.41 },
};

/**
 * Direct-To-Garment (DTG) Pricing
 * For WHITE/LIGHT GARMENTS - by print size and quantity
 */
const DTG_LIGHT_PRICING: Record<string, Record<string, number>> = {
  '1-11': { '1-25': 5.75, '26-50': 6.00, '51-80': 6.25, '81-144': 6.50, '145+': 6.95 },
  '12-23': { '1-25': 5.50, '26-50': 5.75, '51-80': 6.00, '81-144': 6.25, '145+': 6.65 },
  '24-47': { '1-25': 5.25, '26-50': 5.50, '51-80': 5.75, '81-144': 6.00, '145+': 6.45 },
  '48-71': { '1-25': 5.00, '26-50': 5.25, '51-80': 5.50, '81-144': 6.25, '145+': 6.70 },
  '72-149': { '1-25': 4.75, '26-50': 5.00, '51-80': 5.25, '81-144': 5.50, '145+': 5.95 },
  '150-299': { '1-25': 4.50, '26-50': 4.75, '51-80': 5.00, '81-144': 5.25, '145+': 5.50 },
  '300-499': { '1-25': 4.25, '26-50': 4.50, '51-80': 4.75, '81-144': 5.00, '145+': 5.45 },
  '500+': { '1-25': 3.95, '26-50': 4.20, '51-80': 4.45, '81-144': 4.70, '145+': 5.15 },
};

/**
 * Direct-To-Garment (DTG) Pricing
 * For BLACK/DARK GARMENTS - by print size and quantity
 */
const DTG_DARK_PRICING: Record<string, Record<string, number>> = {
  '1-11': { '1-25': 6.25, '26-50': 6.50, '51-80': 6.75, '81-144': 7.00, '145+': 7.45 },
  '12-23': { '1-25': 6.00, '26-50': 6.25, '51-80': 6.50, '81-144': 6.75, '145+': 7.20 },
  '24-47': { '1-25': 5.75, '26-50': 6.00, '51-80': 6.25, '81-144': 6.50, '145+': 6.95 },
  '48-71': { '1-25': 5.50, '26-50': 5.75, '51-80': 6.00, '81-144': 6.25, '145+': 6.70 },
  '72-149': { '1-25': 5.25, '26-50': 5.50, '51-80': 5.75, '81-144': 6.00, '145+': 6.40 },
  '150-299': { '1-25': 5.00, '26-50': 5.25, '51-80': 5.50, '81-144': 5.75, '145+': 6.20 },
  '300-499': { '1-25': 4.75, '26-50': 5.00, '51-80': 5.25, '81-144': 5.50, '145+': 5.95 },
  '500+': { '1-25': 4.50, '26-50': 4.75, '51-80': 5.00, '81-144': 5.25, '145+': 5.65 },
};

/**
 * Setup Fees
 */
const SETUP_FEES = {
  screenFee: 0.00,        // Per screen (location)
  pmsMatch: 15.00,        // Pantone color matching
  embroiderySetup: 0.00,  // Per location
  dtgSetup: 0.00,         // No setup for DTG
};

/**
 * Extra Location Charges
 */
const LOCATION_CHARGES: Record<DecorationLocation, number> = {
  'front_chest': 0.00,      // Primary location - no charge
  'full_front': 0.00,       // Primary location - no charge
  'back': 0.00,             // Primary location - no charge
  'full_back': 0.00,        // Primary location - no charge
  'left_sleeve': 0.35,      // Sleeve/Leg
  'right_sleeve': 0.35,     // Sleeve/Leg
  'left_leg': 0.35,         // Sleeve/Leg
  'right_leg': 0.35,        // Sleeve/Leg
  'pocket': 0.35,           // Pocket
  'heavy_bulky_bags': 0.75, // Heavy/Bulky/Bags
};

/**
 * Fabric Charges (per item)
 */
const FABRIC_CHARGES = {
  waterResistant: 0.35,
  polyBlend: 0.35,
  nylonAcrylic: 0.35,
};

/**
 * Service Charges (per item)
 */
const SERVICE_CHARGES = {
  fold: 0.20,
  bag: 0.25,
  sticker: 0.10,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getQuantityRange(quantity: number, ranges: string[]): string {
  for (const range of ranges) {
    if (range.endsWith('+')) {
      const min = parseInt(range.replace('+', ''));
      if (quantity >= min) return range;
    } else if (range.includes('-')) {
      const [min, max] = range.split('-').map(Number);
      if (quantity >= min && quantity <= max) return range;
    }
  }
  return ranges[0]; // Default to first range
}

function getStitchRange(stitches: number): string {
  if (stitches < 5000) return '1-4999';
  if (stitches < 7000) return '5000-6999';
  if (stitches < 8000) return '7000-7999';
  if (stitches < 9000) return '8000-8999';
  if (stitches < 10000) return '9000-9999';
  if (stitches < 11000) return '10000-10999';
  if (stitches < 12000) return '11000-11999';
  if (stitches < 13000) return '12000-12999';
  if (stitches < 14000) return '13000-13999';
  if (stitches < 15000) return '14000-14999';
  return '15000+';
}

function getPrintSizeRange(sizeCategory: string): string {
  // Map size categories to square inches
  const sizeMap: Record<string, string> = {
    'xsmall': '1-25',
    'small': '26-50',
    'medium': '51-80',
    'large': '81-144',
    'xlarge': '145+',
  };
  return sizeMap[sizeCategory] || '51-80';
}

// ============================================
// MAIN PRICING CALCULATOR
// ============================================

export function calculateDecorationPricing(
  input: DecorationPricingInput
): DecorationPricingResult {
  let baseUnitCost = 0;
  let setupFee = 0;

  // Calculate base decoration cost
  switch (input.method) {
    case 'screen_print':
      baseUnitCost = calculateScreenPrintCost(input.quantity, input.colors || 1, input.maxColors);
      setupFee = SETUP_FEES.screenFee * (input.locations?.length || 1);
      break;
      
    case 'embroidery':
      baseUnitCost = calculateEmbroideryCost(input.quantity, input.stitches || 5000);
      setupFee = SETUP_FEES.embroiderySetup * (input.locations?.length || 1);
      break;
      
    case 'dtg':
      baseUnitCost = calculateDTGCost(
        input.quantity,
        input.garmentColor || 'light',
        input.printSizeCategory || 'medium'
      );
      setupFee = SETUP_FEES.dtgSetup;
      break;
  }

  // Calculate extra location charges
  const extraLocations: { location: DecorationLocation; charge: number }[] = [];
  let extraLocationCharges = 0;
  
  if (input.locations && input.locations.length > 1) {
    // First location is primary (no charge), additional locations have charges
    for (let i = 1; i < input.locations.length; i++) {
      const location = input.locations[i];
      const charge = LOCATION_CHARGES[location] || 0;
      extraLocations.push({ location, charge });
      extraLocationCharges += charge;
    }
  }

  // Calculate fabric charges
  let fabricCharge = 0;
  if (input.isWaterResistant) fabricCharge += FABRIC_CHARGES.waterResistant;
  if (input.isPolyBlend) fabricCharge += FABRIC_CHARGES.polyBlend;
  if (input.isNylonAcrylic) fabricCharge += FABRIC_CHARGES.nylonAcrylic;

  // Calculate service charges
  let serviceCharge = 0;
  if (input.needsFolding) serviceCharge += SERVICE_CHARGES.fold;
  if (input.needsBagging) serviceCharge += SERVICE_CHARGES.bag;
  if (input.needsSticker) serviceCharge += SERVICE_CHARGES.sticker;

  // Total unit cost
  const unitCost = baseUnitCost + extraLocationCharges + fabricCharge + serviceCharge;

  // Total decoration cost for the order
  const totalDecorationCost = (unitCost * input.quantity) + setupFee;

  return {
    unitCost,
    setupFee,
    totalDecorationCost,
    extraLocationCharges,
    fabricCharges: fabricCharge,
    serviceCharges: serviceCharge,
    breakdown: {
      baseUnitCost,
      extraLocations,
      fabricCharge,
      serviceCharge,
    },
  };
}

function calculateScreenPrintCost(
  quantity: number,
  colors: number,
  maxColors?: number
): number {
  // Limit colors to max if specified
  const actualColors = maxColors ? Math.min(colors, maxColors) : colors;
  
  const quantityRange = getQuantityRange(
    quantity,
    Object.keys(SCREEN_PRINT_PRICING)
  );
  
  const pricing = SCREEN_PRINT_PRICING[quantityRange];
  return pricing[actualColors] || pricing[12]; // Default to 12 colors if not found
}

function calculateEmbroideryCost(quantity: number, stitches: number): number {
  const quantityRange = getQuantityRange(
    quantity,
    Object.keys(EMBROIDERY_PRICING)
  );
  
  const stitchRange = getStitchRange(stitches);
  
  return EMBROIDERY_PRICING[quantityRange][stitchRange] || 5.25;
}

function calculateDTGCost(
  quantity: number,
  garmentColor: GarmentColor,
  printSizeCategory: string
): number {
  const pricingTable = garmentColor === 'dark' 
    ? DTG_DARK_PRICING 
    : DTG_LIGHT_PRICING;
  
  const quantityRange = getQuantityRange(
    quantity,
    Object.keys(pricingTable)
  );
  
  const sizeRange = getPrintSizeRange(printSizeCategory);
  
  return pricingTable[quantityRange][sizeRange] || 5.75;
}

/**
 * Calculate total order cost including product, decoration, and shipping
 */
export interface TotalOrderCostInput {
  productUnitPrice: number;
  quantity: number;
  decoration?: DecorationPricingInput;
  shippingCost?: number;
  taxRate?: number;
}

export interface TotalOrderCostResult {
  productSubtotal: number;
  decorationTotal: number;
  setupFees: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export function calculateTotalOrderCost(
  input: TotalOrderCostInput
): TotalOrderCostResult {
  const productSubtotal = input.productUnitPrice * input.quantity;
  
  let decorationTotal = 0;
  let setupFees = 0;
  
  if (input.decoration) {
    const decorationPricing = calculateDecorationPricing(input.decoration);
    decorationTotal = decorationPricing.unitCost * input.quantity;
    setupFees = decorationPricing.setupFee;
  }
  
  const subtotal = productSubtotal + decorationTotal + setupFees;
  const shipping = input.shippingCost || 0;
  const tax = (subtotal + shipping) * (input.taxRate || 0);
  const total = subtotal + shipping + tax;
  
  return {
    productSubtotal,
    decorationTotal,
    setupFees,
    subtotal,
    shipping,
    tax,
    total,
  };
}

