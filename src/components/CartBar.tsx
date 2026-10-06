'use client';

import Link from 'next/link';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { formatMoney } from '@/lib/utils';

type Props = {
  href: string;
  label: string;
  count: number;
  amount: number;
};

export default function CartBar({ href, label, count, amount }: Props) {
  if (!count) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur-md" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <Link
        href={href}
        className="mx-auto flex h-14 max-w-3xl items-center justify-between rounded-lg bg-neutral-950 px-4 text-white shadow-lg transition hover:bg-neutral-800"
      >
        <span className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <ShoppingBag size={18} />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b4232b] px-1 text-[10px] font-bold">
              {count}
            </span>
          </span>
          <span className="text-sm font-semibold">{label}</span>
        </span>
        <span className="flex items-center gap-3 text-sm font-bold">
          {formatMoney(amount)}
          <ArrowRight size={18} />
        </span>
      </Link>
    </div>
  );
}
