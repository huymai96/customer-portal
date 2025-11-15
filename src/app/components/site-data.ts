export interface NavLink {
  label: string;
  slug: string;
}

export interface CategoryTile {
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface SampleProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  price: number;
}

export const NAV_LINKS: NavLink[] = [
  { label: 'New', slug: 'new' },
  { label: 'T-Shirts', slug: 't-shirts' },
  { label: 'Polos', slug: 'polos-knits' },
  { label: 'Fleece', slug: 'fleece' },
  { label: 'Outerwear', slug: 'outerwear' },
  { label: 'Headwear', slug: 'headwear' },
  { label: 'Workwear', slug: 'workwear' },
  { label: 'Sale', slug: 'sale' },
];

export const CATEGORY_TILES: CategoryTile[] = [
  {
    name: 'T-Shirts',
    slug: 't-shirts',
    description: 'Ringspun, heavyweight, and performance tees.',
    icon: '👕',
  },
  {
    name: 'Polos / Knits',
    slug: 'polos-knits',
    description: 'Classic and performance polos ready for embroidery.',
    icon: '🧵',
  },
  {
    name: 'Sweatshirts / Fleece',
    slug: 'fleece',
    description: 'Cozy crews and hoodies for every merch drop.',
    icon: '🧥',
  },
  {
    name: 'Outerwear',
    slug: 'outerwear',
    description: 'Soft shells, insulated puffers, and rain jackets.',
    icon: '🧊',
  },
  {
    name: 'Headwear',
    slug: 'headwear',
    description: 'Structured caps, beanies, and visors.',
    icon: '🧢',
  },
  {
    name: 'Bags',
    slug: 'bags',
    description: 'Backpacks, totes, and tech carryalls.',
    icon: '🎒',
  },
  {
    name: 'Workwear',
    slug: 'workwear',
    description: 'Durable uniforms for crews and trades.',
    icon: '👷',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Blankets, aprons, drinkware, and more.',
    icon: '🎁',
  },
  {
    name: "Women's",
    slug: 'womens',
    description: 'Tailored fits for women-owned programs.',
    icon: '👚',
  },
];

export const RECENT_SEARCHES = ['Bella+Canvas 3001', 'Carhartt Rain Defender', 'Comfort Colors'];

export const POPULAR_CATEGORIES = ['T-Shirts', 'Polos', 'Hoodies', 'Hats'];

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: 'g500',
    name: 'Heavy Cotton Tee',
    brand: 'Gildan',
    category: 't-shirts',
    color: 'White',
    price: 2.45,
  },
  {
    id: 'bc3001',
    name: 'Unisex Jersey Tee',
    brand: 'Bella+Canvas',
    category: 't-shirts',
    color: 'Black',
    price: 4.87,
  },
  {
    id: 'pc78h',
    name: 'Core Fleece Hoodie',
    brand: 'Port & Company',
    category: 'fleece',
    color: 'Athletic Heather',
    price: 13.2,
  },
  {
    id: 'st650',
    name: 'Competitor Polo',
    brand: 'Sport-Tek',
    category: 'polos-knits',
    color: 'True Royal',
    price: 11.98,
  },
  {
    id: 'j317',
    name: 'Core Soft Shell Jacket',
    brand: 'Port Authority',
    category: 'outerwear',
    color: 'Black',
    price: 27.99,
  },
  {
    id: 'csj60',
    name: 'Duck Cloth Work Jacket',
    brand: 'CornerStone',
    category: 'workwear',
    color: 'Carhartt Brown',
    price: 46.5,
  },
  {
    id: 'c112',
    name: 'Trucker Snapback',
    brand: 'Port Authority',
    category: 'headwear',
    color: 'Navy/White',
    price: 6.1,
  },
  {
    id: 'bg227',
    name: 'Urban Backpack',
    brand: 'Port Authority',
    category: 'bags',
    color: 'Slate',
    price: 32.0,
  },
];

