export interface CatalogLink {
  label: string;
  query: string;
  categorySlug?: string;
}

export interface CategoryCard {
  title: string;
  description: string;
  slug: string;
  image: string;
}

export interface CategoryPreset {
  slug: string;
  label: string;
  blurb: string;
  styleNumbers: string[];
}

export const PRODUCT_LINKS: CatalogLink[] = [
  { label: 'T-Shirts', query: 't-shirt', categorySlug: 't-shirts' },
  { label: 'Sweatshirts & Fleece', query: 'fleece', categorySlug: 'fleece' },
  { label: 'Outerwear', query: 'outerwear', categorySlug: 'outerwear' },
  { label: 'Polos & Knits', query: 'polo', categorySlug: 'polos-knits' },
  { label: 'Woven Shirts', query: 'woven', categorySlug: 'woven-shirts' },
  { label: 'Hats & Accessories', query: 'hat', categorySlug: 'hats-accessories' },
  { label: 'Bags & Packs', query: 'bag', categorySlug: 'bags-packs' },
];

export const BRAND_LINKS: CatalogLink[] = [
  { label: 'Gildan', query: 'brand:Gildan' },
  { label: 'Port & Company', query: 'brand:Port & Company' },
  { label: 'District', query: 'brand:District' },
  { label: 'Bella+Canvas', query: 'brand:Bella Canvas' },
  { label: 'Carhartt', query: 'brand:Carhartt' },
  { label: 'Nike', query: 'brand:Nike' },
];

export const CATEGORY_CARDS: CategoryCard[] = [
  {
    title: 'Shop Outerwear',
    description: 'Weather-ready shells and insulated layers for any forecast.',
    slug: 'outerwear',
    image: 'https://cdn.sanmar.com/medias/sys_master/images/images/hc0/hfe/12011099869278/outerwear.jpg',
  },
  {
    title: 'Shop T-Shirts',
    description: 'Everyday tees in core colors, fashion fits, and performance blends.',
    slug: 't-shirts',
    image: 'https://cdn.sanmar.com/medias/sys_master/images/images/hc6/h2e/12107841540126/tshirts.jpg',
  },
  {
    title: 'Shop Woven Shirts',
    description: 'Polished wovens for the office, events, and corporate gifting.',
    slug: 'woven-shirts',
    image: 'https://cdn.sanmar.com/medias/sys_master/images/images/h8e/h9e/11306963611678/wovens.jpg',
  },
  {
    title: 'Shop Sweatshirts/Fleece',
    description: 'Cozy crews and hoodies for merch drops or team uniforms.',
    slug: 'fleece',
    image: 'https://cdn.sanmar.com/medias/sys_master/images/images/h4c/h15/11610189791262/fleece.jpg',
  },
  {
    title: 'Shop Polos',
    description: 'Performance and classic knits with embroidery-ready plackets.',
    slug: 'polos-knits',
    image: 'https://cdn.sanmar.com/medias/sys_master/images/images/h27/h1e/11306968330270/polos.jpg',
  },
  {
    title: 'Shop Accessories',
    description: 'Hats, bags, and drinkware to complete the kit.',
    slug: 'hats-accessories',
    image: 'https://cdn.sanmar.com/medias/sys_master/images/images/had/h80/11306969453342/accessories.jpg',
  },
];

export const CATEGORY_PRESETS: Record<string, CategoryPreset> = {
  outerwear: {
    slug: 'outerwear',
    label: 'Outerwear',
    blurb: 'Weatherproof shells, insulated puffers, and corporate soft shells ready for embroidery.',
    styleNumbers: ['J317', 'EB224', 'L709', 'J325', 'EB552'],
  },
  't-shirts': {
    slug: 't-shirts',
    label: 'T-Shirts',
    blurb: 'Core merch tees across weights, fits, and blends for every campaign.',
    styleNumbers: ['5000', 'PC54', '1717', 'DT6000', '3001'],
  },
  fleece: {
    slug: 'fleece',
    label: 'Sweatshirts & Fleece',
    blurb: 'Hoodies and crews in ring-spun fleece, pigment-dyed finishes, and cozy blends.',
    styleNumbers: ['PC78H', 'DT6100', '18500', 'SS4500', 'LST253'],
  },
  'polos-knits': {
    slug: 'polos-knits',
    label: 'Polos & Knits',
    blurb: 'Performance polos and classic knits that dress up embroidery-ready uniforms.',
    styleNumbers: ['K500', 'L500', 'ST650', 'CXOOS', '88181'],
  },
  'woven-shirts': {
    slug: 'woven-shirts',
    label: 'Woven Shirts',
    blurb: 'Button-downs for the boardroom, showroom, and front-of-house teams.',
    styleNumbers: ['S638', 'LW701', 'W808', 'TW60', 'RH69'],
  },
  'hats-accessories': {
    slug: 'hats-accessories',
    label: 'Hats & Accessories',
    blurb: 'Decorate-ready caps, beanies, and accessories to round out every drop.',
    styleNumbers: ['C112', 'CP90', 'NE1020', 'DT616', 'BG206'],
  },
  'bags-packs': {
    slug: 'bags-packs',
    label: 'Bags & Packs',
    blurb: 'From totes to tech backpacks, build branded carry solutions instantly.',
    styleNumbers: ['BG99', 'BG76S', 'BG227', 'NEB800', '411072'],
  },
};


