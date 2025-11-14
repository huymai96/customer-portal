/**
 * Decoration Pricing Calculator
 * 
 * Calculates decoration costs based on:
 * - Method (screen, embroidery, DTF, etc.)
 * - Number of colors/stitches
 * - Location count
 * - Quantity breaks
 * - Setup fees
 */

import type { DecorationMethod } from './types';

export interface DecorationPricingInput {
  method: DecorationMethod;
  colors: number;
  locations: number;
  quantity: number;
  rushOrder?: boolean;
}

export interface DecorationPricing {
  setupFee: number;
  unitCost: number;
  totalSetup: number;
  totalDecoration: number;
  totalCost: number;
  breakdown: {
    label: string;
    value: number;
  }[];
}

// Base pricing tables (per location)
const SCREEN_PRINT_PRICING = {
  setup: 35, // Per color
  tiers: [
    { minQty: 1, maxQty: 23, pricePerColor: 3.5 },
    { minQty: 24, maxQty: 47, pricePerColor: 2.75 },
    { minQty: 48, maxQty: 143, pricePerColor: 2.25 },
    { minQty: 144, maxQty: 287, pricePerColor: 1.75 },
    { minQty: 288, maxQty: 999999, pricePerColor: 1.25 },
  ],
};

const EMBROIDERY_PRICING = {
  setup: 50, // Per location
  tiers: [
    { minQty: 1, maxQty: 11, pricePerStitch: 0.012 },
    { minQty: 12, maxQty: 47, pricePerStitch: 0.01 },
    { minQty: 48, maxQty: 143, pricePerStitch: 0.008 },
    { minQty: 144, maxQty: 999999, pricePerStitch: 0.006 },
  ],
  avgStitchCount: 5000, // Average stitches for typical logo
};

const DTF_PRICING = {
  setup: 25, // Per design
  tiers: [
    { minQty: 1, maxQty: 23, price: 4.5 },
    { minQty: 24, maxQty: 47, price: 3.75 },
    { minQty: 48, maxQty: 143, price: 3.25 },
    { minQty: 144, maxQty: 999999, price: 2.75 },
  ],
};

const HEAT_TRANSFER_PRICING = {
  setup: 0, // No setup for vinyl
  tiers: [
    { minQty: 1, maxQty: 11, price: 5.0 },
    { minQty: 12, maxQty: 47, price: 4.25 },
    { minQty: 48, maxQty: 143, price: 3.75 },
    { minQty: 144, maxQty: 999999, price: 3.25 },
  ],
};

const DTG_PRICING = {
  setup: 15, // Per design
  tiers: [
    { minQty: 1, maxQty: 11, price: 6.5 },
    { minQty: 12, maxQty: 47, price: 5.5 },
    { minQty: 48, maxQty: 143, price: 4.75 },
    { minQty: 144, maxQty: 999999, price: 4.0 },
  ],
};

const SUBLIMATION_PRICING = {
  setup: 20, // Per design
  tiers: [
    { minQty: 1, maxQty: 11, price: 7.0 },
    { minQty: 12, maxQty: 47, price: 6.0 },
    { minQty: 48, maxQty: 143, price: 5.25 },
    { minQty: 144, maxQty: 999999, price: 4.5 },
  ],
};

const PATCH_PRICING = {
  setup: 75, // Per design (includes digitizing)
  tiers: [
    { minQty: 1, maxQty: 11, price: 8.0 },
    { minQty: 12, maxQty: 47, price: 6.5 },
    { minQty: 48, maxQty: 143, price: 5.5 },
    { minQty: 144, maxQty: 999999, price: 4.75 },
  ],
};

function findTier<T extends { minQty: number; maxQty: number }>(
  tiers: T[],
  quantity: number
): T | undefined {
  return tiers.find((tier) => quantity >= tier.minQty && quantity <= tier.maxQty);
}

export function calculateDecorationPricing(input: DecorationPricingInput): DecorationPricing {
  const { method, colors, locations, quantity, rushOrder } = input;

  let setupFee = 0;
  let unitCost = 0;
  const breakdown: DecorationPricing['breakdown'] = [];

  switch (method) {
    case 'screen': {
      setupFee = SCREEN_PRINT_PRICING.setup * colors * locations;
      const tier = findTier(SCREEN_PRINT_PRICING.tiers, quantity);
      if (tier) {
        unitCost = tier.pricePerColor * colors * locations;
      }
      breakdown.push(
        { label: 'Screen Setup', value: setupFee },
        { label: `${colors} Color(s) × ${locations} Location(s)`, value: unitCost * quantity }
      );
      break;
    }

    case 'emb': {
      setupFee = EMBROIDERY_PRICING.setup * locations;
      const tier = findTier(EMBROIDERY_PRICING.tiers, quantity);
      if (tier) {
        const stitchCount = EMBROIDERY_PRICING.avgStitchCount;
        unitCost = tier.pricePerStitch * stitchCount * locations;
      }
      breakdown.push(
        { label: 'Digitizing Setup', value: setupFee },
        { label: `Embroidery (${EMBROIDERY_PRICING.avgStitchCount} stitches)`, value: unitCost * quantity }
      );
      break;
    }

    case 'dtf': {
      setupFee = DTF_PRICING.setup * locations;
      const tier = findTier(DTF_PRICING.tiers, quantity);
      if (tier) {
        unitCost = tier.price * locations;
      }
      breakdown.push(
        { label: 'DTF Setup', value: setupFee },
        { label: `DTF Transfer × ${locations} Location(s)`, value: unitCost * quantity }
      );
      break;
    }

    case 'heat': {
      setupFee = HEAT_TRANSFER_PRICING.setup * locations;
      const tier = findTier(HEAT_TRANSFER_PRICING.tiers, quantity);
      if (tier) {
        unitCost = tier.price * locations;
      }
      breakdown.push(
        { label: 'Heat Transfer', value: unitCost * quantity }
      );
      break;
    }

    case 'dtg': {
      setupFee = DTG_PRICING.setup * locations;
      const tier = findTier(DTG_PRICING.tiers, quantity);
      if (tier) {
        unitCost = tier.price * locations;
      }
      breakdown.push(
        { label: 'DTG Setup', value: setupFee },
        { label: `DTG Print × ${locations} Location(s)`, value: unitCost * quantity }
      );
      break;
    }

    case 'sublimation': {
      setupFee = SUBLIMATION_PRICING.setup * locations;
      const tier = findTier(SUBLIMATION_PRICING.tiers, quantity);
      if (tier) {
        unitCost = tier.price * locations;
      }
      breakdown.push(
        { label: 'Sublimation Setup', value: setupFee },
        { label: `Sublimation × ${locations} Location(s)`, value: unitCost * quantity }
      );
      break;
    }

    case 'patch': {
      setupFee = PATCH_PRICING.setup * locations;
      const tier = findTier(PATCH_PRICING.tiers, quantity);
      if (tier) {
        unitCost = tier.price * locations;
      }
      breakdown.push(
        { label: 'Patch Setup & Digitizing', value: setupFee },
        { label: `Patch Application × ${locations} Location(s)`, value: unitCost * quantity }
      );
      break;
    }
  }

  const totalSetup = setupFee;
  const totalDecoration = unitCost * quantity;
  let totalCost = totalSetup + totalDecoration;

  // Rush order surcharge (20%)
  if (rushOrder) {
    const rushFee = totalCost * 0.2;
    breakdown.push({ label: 'Rush Order (20%)', value: rushFee });
    totalCost += rushFee;
  }

  return {
    setupFee,
    unitCost,
    totalSetup,
    totalDecoration,
    totalCost,
    breakdown,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

