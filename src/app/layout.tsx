import type { ReactNode } from 'react';
import { CartProvider } from '@/contexts/CartContext';
import './globals.css';

export const metadata = {
  title: 'Promos Ink Portal',
  description: 'SanMar-style catalog and decoration workflow',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}



