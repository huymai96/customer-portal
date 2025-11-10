import type { DecorationSpec } from '@/lib/types';

export interface PricingInput {
  supplierPartId: string;
  colorCode: string;
  sizeCode: string;
  qty: number;
  decoration?: DecorationSpec | null;
  baseBlankCost?: number;
}

export interface LinePricingBreakdown {
  unitBlankCost: number;
  unitDecorationCost: number;
  unitSetupCost: number;
  unitMarkup: number;
  unitPrice: number;
  extendedPrice: number;
  setupFeeTotal: number;
  notes: string[];
}

interface ScreenPricingConfig {
  setupFee: number;
  underbaseFee: number;
  additionalColorRunCharge: number;
  runChargeTiers: Array<{ maxQty: number; perUnit: number }>;
}

interface EmbroideryPricingConfig {
  setupFee: number;
  stitchBrackets: Array<{ maxStitches: number; perUnit: number }>;
  defaultStitchCount: number;
}

interface HeatPricingConfig {
  setupFee: number;
  minimumSquareInches: number;
  perSquareInch: number;
}

interface PricingConfig {
  blank: {
    defaultBlankCost: number;
    markupPercentage: number;
  };
  screen: ScreenPricingConfig;
  emb: EmbroideryPricingConfig;
  heat: HeatPricingConfig;
}

const pricingConfig: PricingConfig = {
  blank: {
    defaultBlankCost: 4.25,
    markupPercentage: 0.2,
  },
  screen: {
    setupFee: 25,
    underbaseFee: 0.18,
    additionalColorRunCharge: 0.35,
    runChargeTiers: [
      { maxQty: 35, perUnit: 1.85 },
      { maxQty: 71, perUnit: 1.25 },
      { maxQty: 145, perUnit: 0.95 },
      { maxQty: Number.POSITIVE_INFINITY, perUnit: 0.75 },
    ],
  },
  emb: {
    setupFee: 35,
    stitchBrackets: [
      { maxStitches: 8000, perUnit: 2.8 },
      { maxStitches: 12000, perUnit: 3.4 },
      { maxStitches: Number.POSITIVE_INFINITY, perUnit: 4.1 },
    ],
    defaultStitchCount: 7500,
  },
  heat: {
    setupFee: 18,
    minimumSquareInches: 10,
    perSquareInch: 0.28,
  },
};

function resolveScreenRunCharge(qty: number, config: ScreenPricingConfig) {
  const tier = config.runChargeTiers.find((bracket) => qty <= bracket.maxQty);
  return tier?.perUnit ?? config.runChargeTiers[config.runChargeTiers.length - 1]?.perUnit ?? 0;
}

function resolveEmbroideryRunCharge(stitchCount: number, config: EmbroideryPricingConfig) {
  const bracket = config.stitchBrackets.find((entry) => stitchCount <= entry.maxStitches);
  return bracket?.perUnit ?? config.stitchBrackets[config.stitchBrackets.length - 1]?.perUnit ?? 0;
}

function calculateScreenDecorationCost(qty: number, decoration: DecorationSpec, config: ScreenPricingConfig) {
  const locationCount = decoration.locations?.length ?? 1;
  const colorCount = decoration.colors ?? 1;
  const baseRun = resolveScreenRunCharge(qty, config);
  const perUnit = baseRun + (colorCount - 1) * config.additionalColorRunCharge;
  const underbase = decoration.underbase ? config.underbaseFee : 0;
  const unitDecorationCost = (perUnit + underbase) * locationCount;
  const setupFeeTotal = config.setupFee * locationCount;
  return { unitDecorationCost, setupFeeTotal };
}

function calculateEmbroideryDecorationCost(decoration: DecorationSpec, config: EmbroideryPricingConfig) {
  const locationCount = decoration.locations?.length ?? 1;
  const stitchCount = decoration.stitchCount ?? config.defaultStitchCount;
  const perUnit = resolveEmbroideryRunCharge(stitchCount, config);
  const unitDecorationCost = perUnit * locationCount;
  const setupFeeTotal = config.setupFee * locationCount;
  return { unitDecorationCost, setupFeeTotal };
}

function calculateHeatDecorationCost(decoration: DecorationSpec, config: HeatPricingConfig) {
  const locationCount = decoration.locations?.length ?? 1;
  const totalArea = decoration.locations?.reduce((sum, location) => {
    const width = location.widthIn ?? Math.sqrt(config.minimumSquareInches);
    const height = location.heightIn ?? Math.sqrt(config.minimumSquareInches);
    return sum + width * height;
  }, 0) ?? config.minimumSquareInches * locationCount;
  const averageArea = Math.max(totalArea / Math.max(locationCount, 1), config.minimumSquareInches);
  const unitDecorationCost = averageArea * config.perSquareInch * locationCount;
  const setupFeeTotal = config.setupFee * locationCount;
  return { unitDecorationCost, setupFeeTotal };
}

export function calculateLinePricing(
  input: PricingInput,
  config: PricingConfig = pricingConfig
): LinePricingBreakdown {
  const notes: string[] = [];
  const qty = Math.max(input.qty, 1);
  const blankUnitCost = input.baseBlankCost && input.baseBlankCost > 0 ? input.baseBlankCost : config.blank.defaultBlankCost;

  let unitDecorationCost = 0;
  let setupFeeTotal = 0;

  if (input.decoration) {
    switch (input.decoration.method) {
      case 'screen': {
        const result = calculateScreenDecorationCost(qty, input.decoration, config.screen);
        unitDecorationCost = result.unitDecorationCost;
        setupFeeTotal = result.setupFeeTotal;
        break;
      }
      case 'emb': {
        const result = calculateEmbroideryDecorationCost(input.decoration, config.emb);
        unitDecorationCost = result.unitDecorationCost;
        setupFeeTotal = result.setupFeeTotal;
        break;
      }
      case 'heat': {
        const result = calculateHeatDecorationCost(input.decoration, config.heat);
        unitDecorationCost = result.unitDecorationCost;
        setupFeeTotal = result.setupFeeTotal;
        break;
      }
      default: {
        notes.push('Decoration method not recognized; using blank cost only.');
        break;
      }
    }
  }

  const unitSetupCost = setupFeeTotal / qty;
  const baseUnit = blankUnitCost + unitDecorationCost + unitSetupCost;
  const unitMarkup = baseUnit * config.blank.markupPercentage;
  const unitPrice = baseUnit + unitMarkup;

  return {
    unitBlankCost: blankUnitCost,
    unitDecorationCost,
    unitSetupCost,
    unitMarkup,
    unitPrice,
    extendedPrice: unitPrice * qty,
    setupFeeTotal,
    notes,
  };
}

export const defaultPricingConfig = pricingConfig;
