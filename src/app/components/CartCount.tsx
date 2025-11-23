'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CartCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCart() {
      try {
        const response = await fetch('/api/cart');
        if (response.ok) {
          const data = await response.json();
          const totalItems = data.lines?.reduce((sum: number, line: { sizeQuantities: Array<{ quantity: number }> }) => {
            return sum + (line.sizeQuantities?.reduce((lineSum: number, sq: { quantity: number }) => lineSum + sq.quantity, 0) || 0);
          }, 0) || 0;
          setCount(totalItems);
        }
      } catch (error) {
        console.error('Failed to fetch cart:', error);
        setCount(0);
      }
    }

    fetchCart();
    
    // Refresh cart count periodically, on focus, and on cart update events
    const interval = setInterval(fetchCart, 5000);
    const handleFocus = () => fetchCart();
    const handleCartUpdate = () => fetchCart();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  return (
    <Link
      className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:inline-flex relative"
      href="/cart"
      aria-label="Cart"
    >
      <CartIcon />
      Cart
      {count !== null && count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 3h1.386c.51 0 .955.343 1.09.835l.383 1.436M7.5 14.25h10.128c.85 0 1.594-.596 1.79-1.43l1.482-6.182A1.125 1.125 0 0019.8 5.25H5.145M7.5 14.25L5.145 5.25M7.5 14.25l-.878 3.074A.75.75 0 007.356 18.75h9.288a.75.75 0 00.734-.576L18 14.25M9 21h.008v.008H9V21zm6 0h.008v.008H15V21z"
      />
    </svg>
  );
}

