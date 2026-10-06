'use client';

import { Check, Minus, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MenuItem, Locale, MenuOptionGroup, MenuOptionValue } from '@/types/menu';
import { pickText, t } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';
import { useCartStore } from '@/lib/cart-store';

type Props = {
  item: (MenuItem & { videoUrl?: string | null; imageUrl?: string | null }) | null;
  locale: Locale;
  open: boolean;
  onClose: () => void;
};

export default function MenuItemModal({ item, locale, open, onClose }: Props) {
  const text = t(locale);
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && item) {
      setQuantity(1);
      setSelected({});
    }
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]') || []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const targets = focusable();
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  const optionGroups = item?.options ?? [];
  const hasVideo = !!item?.videoUrl;
  const hasImage = !!item?.imageUrl;

  const toggleValue = (group: MenuOptionGroup, value: MenuOptionValue) => {
    setSelected((previous) => {
      const current = previous[group.id] || [];
      if (group.multiSelect) {
        const exists = current.includes(value.id);
        return {
          ...previous,
          [group.id]: exists ? current.filter((id) => id !== value.id) : [...current, value.id],
        };
      }
      return { ...previous, [group.id]: [value.id] };
    });
  };

  const selectedOptions = useMemo(() => {
    const result: {
      groupId: string;
      valueId: string;
      group: { en: string; ko: string };
      value: { en: string; ko: string };
      priceDelta: number;
    }[] = [];

    for (const group of optionGroups) {
      const selectedIds = selected[group.id] || [];
      for (const value of group.values) {
        if (selectedIds.includes(value.id)) {
          result.push({ groupId: group.id, valueId: value.id, group: group.name, value: value.name, priceDelta: value.priceDelta });
        }
      }
    }
    return result;
  }, [optionGroups, selected]);

  const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
  const unitPrice = (item?.price ?? 0) + optionsTotal;
  const lineTotal = unitPrice * quantity;

  const handleAdd = () => {
    if (!item) return;
    const requiredMissing = optionGroups.some(
      (group) => group.required && !(selected[group.id] && selected[group.id].length > 0)
    );
    if (requiredMissing) {
      alert(locale === 'ko' ? '필수 옵션을 선택해 주세요.' : 'Please select required options.');
      return;
    }

    addItem({
      menuItemId: item.id,
      name: item.name,
      quantity,
      unitPrice,
      options: selectedOptions,
      lineTotal,
    });
    onClose();
  };

  if (!open || !item) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-item-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-white text-neutral-950 shadow-2xl sm:rounded-lg">
        {hasVideo || hasImage ? (
          <div className="relative h-[230px] w-full bg-neutral-100 sm:h-[260px]">
            {hasVideo ? (
              <video src={item.videoUrl!} autoPlay muted loop playsInline className="h-full w-full object-cover" />
            ) : (
              <img
                src={item.imageUrl!}
                alt={pickText(item.name, locale)}
                className="h-full w-full object-cover"
              />
            )}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-950 shadow-md"
              aria-label={locale === 'ko' ? '닫기' : 'Close'}
            >
              <X size={19} />
            </button>
          </div>
        ) : null}

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="menu-item-title" className="text-2xl font-bold leading-tight">
                {pickText(item.name, locale)}
              </h2>
              {pickText(item.description, locale) ? (
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  {pickText(item.description, locale)}
                </p>
              ) : null}
              <p className="mt-3 text-base font-bold">{formatMoney(item.price)}</p>
            </div>
            {!hasVideo && !hasImage ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200"
                aria-label={locale === 'ko' ? '닫기' : 'Close'}
              >
                <X size={19} />
              </button>
            ) : null}
          </div>

          {optionGroups.length ? (
            <div className="mt-7 divide-y divide-neutral-200 border-y border-neutral-200">
              {optionGroups.map((group) => (
                <fieldset key={group.id} className="py-5">
                  <legend className="flex w-full items-center justify-between gap-3 text-sm font-bold">
                    <span>{pickText(group.name, locale)}</span>
                    <span className="text-xs font-medium text-neutral-500">
                      {group.required
                        ? locale === 'ko' ? '필수 선택' : 'Required'
                        : locale === 'ko' ? '선택 사항' : 'Optional'}
                    </span>
                  </legend>
                  <div className="mt-3 space-y-2">
                    {group.values.map((value) => {
                      const checked = (selected[group.id] || []).includes(value.id);
                      return (
                        <label
                          key={value.id}
                          className={`flex min-h-12 cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-neutral-500 ${
                            checked ? 'border-neutral-950 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type={group.multiSelect ? 'checkbox' : 'radio'}
                              checked={checked}
                              name={group.id}
                              onChange={() => toggleValue(group, value)}
                              className="sr-only"
                            />
                            <span
                              className={`flex h-5 w-5 items-center justify-center border ${
                                group.multiSelect ? 'rounded' : 'rounded-full'
                              } ${checked ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300'}`}
                            >
                              {checked ? <Check size={13} strokeWidth={3} /> : null}
                            </span>
                            <span className="text-sm font-medium">{pickText(value.name, locale)}</span>
                          </span>
                          <span className="text-sm text-neutral-500">
                            {value.priceDelta > 0 ? `+${formatMoney(value.priceDelta)}` : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <span className="text-sm font-bold">{text.quantity}</span>
            <div className="flex h-11 items-center overflow-hidden rounded-lg border border-neutral-200">
              <button
                type="button"
                className="flex h-full w-11 items-center justify-center text-neutral-700 hover:bg-neutral-50"
                onClick={() => setQuantity((previous) => Math.max(1, previous - 1))}
                aria-label={locale === 'ko' ? '수량 줄이기' : 'Decrease quantity'}
              >
                <Minus size={17} />
              </button>
              <span className="min-w-10 text-center text-sm font-bold">{quantity}</span>
              <button
                type="button"
                className="flex h-full w-11 items-center justify-center text-neutral-700 hover:bg-neutral-50"
                disabled={quantity >= 100}
                onClick={() => setQuantity((previous) => Math.min(100, previous + 1))}
                aria-label={locale === 'ko' ? '수량 늘리기' : 'Increase quantity'}
              >
                <Plus size={17} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="mt-6 flex h-14 w-full items-center justify-between rounded-lg bg-[#b4232b] px-5 text-sm font-bold text-white transition hover:bg-[#991b23]"
          >
            <span>{text.addToCart}</span>
            <span>{formatMoney(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
