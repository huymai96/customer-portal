/**
 * Intelligent Swatch URL Generator
 * Generates swatch URLs for colors that don't have them in the database
 * Based on SanMar's swatch naming patterns
 */

interface SwatchUrlPattern {
  pattern: RegExp;
  template: (styleCode: string, colorCode: string) => string;
}

// Known SanMar swatch URL patterns
const SANMAR_SWATCH_PATTERNS: SwatchUrlPattern[] = [
  // Pattern 1: STYLECODE_COLORCODE.gif (most common)
  {
    pattern: /.*/,
    template: (style, color) => `${style}_${color}.gif`,
  },
  // Pattern 2: port_colorname.gif (Port & Company products)
  {
    pattern: /^(PC|PORT)/i,
    template: (style, color) => `port_${color.toLowerCase().replace(/_/g, '')}.gif`,
  },
  // Pattern 3: Lowercase no underscore
  {
    pattern: /.*/,
    template: (style, color) => `${style.toLowerCase()}_${color.toLowerCase().replace(/_/g, '')}.gif`,
  },
];

/**
 * Color code normalization mapping
 * Maps inventory color codes to likely swatch file names
 */
const COLOR_CODE_NORMALIZATIONS: Record<string, string[]> = {
  // Athletic variations
  ATH_MAROON: ['ATHMAROON', 'ATHLETICMAROON', 'ATH_MAROON'],
  ATH_HEATHER: ['ATHHEATHER', 'ATHLETICHEATHER', 'ATH_HEATHER'],
  HTHR_ATH_MROON: ['HEATHERATHLETICMAROON', 'HTHRATHMAROON'],
  
  // Dark variations
  DK_CHOC_BROWN: ['DKCHOCBROWN', 'DARKCHOCBROWN', 'DARKCHOCOLATEBROWN'],
  DK_HTHR_GREY: ['DKHTHRGREY', 'DARKHEATHERGREY', 'DARKHEATHERGRAY'],
  DKHTGRY: ['DKHEATHERGREY', 'DARKHEATHERGRAY'],
  
  // Heather variations
  HTHR_DK_CH_BRN: ['HTHRDKCHBROWN', 'HEATHERDARKCHOCOLATEBROWN'],
  BLKHTHR: ['BLACKHEATHER', 'BLKHEATHER'],
  OATHTHR: ['OATHEATHER', 'OATMEALHEATHER'],
  
  // Color combinations
  ATHKLLY: ['ATHLETICKELLYGREEN', 'ATHKELLY'],
  HTDDSTYPCH: ['HEATHERDUSTYPEACH', 'HEATHERDUSTYPINK'],
  HTSANGRIA: ['HEATHERSANGRIA'],
  
  // Olive variations
  OLVDRABGNH: ['OLIVEDRABGREENHEATHER', 'OLIVEGREEN'],
  OLVDRABGN: ['OLIVEDRABGREEN', 'OLIVEGREEN'],
  
  // Simple normalizations
  PALE_PINK: ['PALEPINK'],
};

/**
 * Attempts to generate a valid swatch URL for a color
 */
export function generateSwatchUrl(
  styleCode: string,
  colorCode: string,
  colorName?: string | null
): string[] {
  const urls: string[] = [];
  const baseUrl = 'https://www.sanmar.com/swatches/color/';
  
  // Get normalized color codes
  const normalizedCodes = COLOR_CODE_NORMALIZATIONS[colorCode] || [colorCode];
  
  // Also try the color name if provided
  if (colorName) {
    const cleanName = colorName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!normalizedCodes.includes(cleanName)) {
      normalizedCodes.push(cleanName);
    }
  }
  
  // Try each pattern with each normalized code
  for (const pattern of SANMAR_SWATCH_PATTERNS) {
    if (pattern.pattern.test(styleCode)) {
      for (const code of normalizedCodes) {
        const filename = pattern.template(styleCode, code);
        urls.push(baseUrl + filename);
      }
    }
  }
  
  // Always include the original color code as fallback
  urls.push(baseUrl + `${styleCode}_${colorCode}.gif`);
  
  return urls;
}

/**
 * Gets the best swatch URL with fallback logic
 */
export function getSwatchUrlWithFallback(
  swatchUrl: string | null | undefined,
  styleCode: string,
  colorCode: string,
  colorName?: string | null
): string | undefined {
  // If we have a swatch URL, use it
  if (swatchUrl) {
    if (swatchUrl.startsWith('http://') || swatchUrl.startsWith('https://')) {
      return swatchUrl;
    }
    return `https://www.sanmar.com/swatches/color/${swatchUrl}`;
  }
  
  // Generate possible URLs
  const possibleUrls = generateSwatchUrl(styleCode, colorCode, colorName);
  
  // Return the first one (we'll handle 404s in the component)
  return possibleUrls[0];
}

