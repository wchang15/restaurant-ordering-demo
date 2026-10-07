'use client';

import { Plus } from 'lucide-react';
import Image from 'next/image';
import { MenuItem, Locale } from '@/types/menu';
import { pickText, t } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';

type Props = {
  item: MenuItem & { videoUrl?: string | null; imageUrl?: string | null };
  locale: Locale;
  onOpen: (item: MenuItem) => void;
};

export default function MenuItemCard({ item, locale, onOpen }: Props) {
  const text = t(locale);
  const hasVideo = !!item.videoUrl;
  const hasImage = !!item.imageUrl;
  const description = pickText(item.description, locale);

  return (
    <article className="relative min-h-[142px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_3px_14px_rgba(23,26,24,0.04)]">
      <button
        type="button"
        onClick={() => onOpen(item)}
        disabled={item.soldOut}
        className="flex h-full w-full items-stretch text-left disabled:cursor-not-allowed"
        aria-label={`${item.soldOut ? text.soldOut : text.addToCart}: ${pickText(item.name, locale)}`}
      >
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div>
            <h3 className="text-base font-bold leading-snug text-neutral-950">
              {pickText(item.name, locale)}
            </h3>
            {description ? (
              <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-neutral-500">{description}</p>
            ) : null}
          </div>
          <div className="mt-auto flex items-center gap-3 pt-4">
            <span className="text-sm font-bold text-neutral-950">{formatMoney(item.price)}</span>
            {item.soldOut ? (
              <span className="text-xs font-semibold text-[#b4232b]">{text.soldOut}</span>
            ) : null}
          </div>
        </div>

        {hasVideo || hasImage ? (
          <div className="relative m-3 ml-0 h-[116px] w-[112px] shrink-0 overflow-hidden rounded-md bg-neutral-100">
            {hasVideo ? (
              <video src={item.videoUrl!} autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <Image
                fill
                unoptimized
                sizes="112px"
                src={item.imageUrl!}
                alt={pickText(item.name, locale)}
                className="h-full w-full object-cover"
              />
            )}
            {!item.soldOut ? (
              <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-950 shadow-md">
                <Plus size={18} strokeWidth={2.4} />
              </span>
            ) : null}
          </div>
        ) : !item.soldOut ? (
          <span className="mr-4 mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-950">
            <Plus size={17} strokeWidth={2.4} />
          </span>
        ) : null}
      </button>
    </article>
  );
}
