'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/cart-store';

export default function ClearCartOnComplete({ enabled }: { enabled: boolean }) {
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    if (enabled) clearCart();
  }, [clearCart, enabled]);

  return null;
}
