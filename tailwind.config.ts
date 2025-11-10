import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f1fbff',
          100: '#e2f6ff',
          200: '#bfe9ff',
          300: '#91d8ff',
          400: '#52bdff',
          500: '#1b99ff',
          600: '#087bff',
          700: '#0b62d6',
          800: '#124fa8',
          900: '#153f83',
        },
      },
    },
  },
  plugins: [],
};

export default config;


