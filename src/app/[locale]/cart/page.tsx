'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CreditCard, LockKeyhole, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useCartStore } from '@/lib/cart-store';
import { Locale } from '@/types/menu';
import { pickText } from '@/lib/i18n';
import { formatMoney } from '@/lib/utils';

export default function CartPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';
  const store = searchParams.get('store') || 'hanin';
  const table = searchParams.get('table') || '';
  const paymentStatus = searchParams.get('payment');
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const setItems = useCartStore((state) => state.setItems);
  const [notes, setNotes] = useState('');
  const [isSending, setIsSending] = useState(false);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Math.round(item.lineTotal * 100), 0) / 100, [items]);
  const tax = Math.round(subtotal * 10) / 100;
  const total = subtotal + tax;
  const isKo = locale === 'ko';

  const labels = {
    title: isKo ? '주문 확인' : 'Review your order',
    subtitle: isKo ? '결제 전에 메뉴와 수량을 확인해 주세요.' : 'Check your items before payment.',
    notes: isKo ? '요청사항' : 'Notes for the kitchen',
    subtotal: isKo ? '소계' : 'Subtotal',
    tax: isKo ? '데모 세금 (10%)' : 'Demo tax (10%)',
    total: isKo ? '합계' : 'Total',
    pay: isKo ? '카드로 결제하기' : 'Continue to payment',
    sending: isKo ? '결제창 준비 중...' : 'Opening payment...',
    back: isKo ? '메뉴로 돌아가기' : 'Back to menu',
    empty: isKo ? '아직 담은 메뉴가 없습니다.' : 'Your order is empty.',
    table: isKo ? '테이블' : 'Table',
  };

  const paymentMessage =
    paymentStatus === 'cancelled'
      ? isKo ? '결제가 취소되었습니다. 다시 시도할 수 있습니다.' : 'Payment was cancelled. You can try again.'
      : paymentStatus === 'incomplete'
        ? isKo ? '결제가 완료되지 않았습니다. 다시 시도해 주세요.' : 'Payment was not completed. Please try again.'
        : paymentStatus === 'error'
          ? isKo ? '결제 확인 중 오류가 발생했습니다. 직원에게 문의해 주세요.' : 'Payment confirmation failed. Please ask staff for help.'
          : '';

  useEffect(() => {
    if (paymentMessage) alert(paymentMessage);
  }, [paymentMessage]);

  const updateQuantity = (index: number, nextQuantity: number) => {
    if (nextQuantity > 100) return;
    if (nextQuantity <= 0) {
      removeItem(index);
      return;
    }
    const nextItems = [...items];
    const current = nextItems[index];
    if (!current) return;
    nextItems[index] = {
      ...current,
      quantity: nextQuantity,
      lineTotal: current.unitPrice * nextQuantity,
    };
    setItems(nextItems);
  };

  const handleSendOrder = async () => {
    if (!items.length || isSending) return;
    try {
      setIsSending(true);
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug: store,
          tableToken: table,
          locale,
          customerNote: notes.trim() || undefined,
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result?.error || (isKo ? '카드결제를 시작하지 못했습니다.' : 'Failed to start card payment.')
        );
      }
      window.location.href = result.url;
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : isKo ? '주문 전송 중 오류가 발생했습니다.' : 'Unable to send your order.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6f3] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/${locale}/menu?store=${store}&table=${table}`}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              aria-label={labels.back}
            >
              <ArrowLeft size={19} />
            </Link>
            <Image src="/hamjibak-logo.png" alt="Hahmjibach" width={130} height={54} className="h-auto w-[118px]" />
            <LanguageSwitcher currentLocale={locale} store={store} table={table} page="cart" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-6 pt-5 sm:px-6 sm:pb-12 sm:pt-8">
        <div className="flex flex-col gap-3 border-b border-neutral-300 pb-4 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
          <div>
            <p className="text-xs font-semibold uppercase text-[#b4232b]">
              {labels.table} {formatTableName(table)}
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{labels.title}</h1>
            <p className="mt-2 text-sm text-neutral-600">{labels.subtitle}</p>
            <p className="mt-2 text-xs font-semibold text-[#b4232b]">{isKo ? '테스트 주문 · 실제 카드 사용 금지' : 'Test orders only · Do not use a real card'}</p>
          </div>
          {items.length ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">
              <ShoppingBag size={15} />
              {items.reduce((sum, item) => sum + item.quantity, 0)} {isKo ? '개' : 'items'}
            </span>
          ) : null}
        </div>

        {items.length === 0 ? (
          <section className="py-20 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm">
              <ShoppingBag size={24} />
            </span>
            <p className="mt-5 text-sm text-neutral-600">{labels.empty}</p>
            <Link
              href={`/${locale}/menu?store=${store}&table=${table}`}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-neutral-950 px-4 text-sm font-semibold text-white"
            >
              <ArrowLeft size={17} />
              {labels.back}
            </Link>
          </section>
        ) : (
          <div className="grid gap-5 pt-4 sm:gap-8 sm:pt-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-3">
              {items.map((item, index) => (
                <article
                  key={`${item.menuItemId}-${index}`}
                  className="rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_3px_14px_rgba(23,26,24,0.04)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-bold text-neutral-950">{pickText(item.name, locale)}</h2>
                      {item.options?.length ? (
                        <div className="mt-1.5 space-y-0.5 text-xs leading-5 text-neutral-500">
                          {item.options.map((option, optionIndex) => (
                            <p key={`${option.group.en}-${option.value.en}-${optionIndex}`}>
                              {pickText(option.group, locale)}: {pickText(option.value, locale)}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-700"
                      aria-label={isKo ? '메뉴 삭제' : 'Remove item'}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div className="flex h-9 items-center overflow-hidden rounded-lg border border-neutral-200">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="flex h-full w-9 items-center justify-center hover:bg-neutral-50"
                        aria-label={isKo ? '수량 줄이기' : 'Decrease quantity'}
                      >
                        <Minus size={15} />
                      </button>
                      <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="flex h-full w-9 items-center justify-center hover:bg-neutral-50"
                        aria-label={isKo ? '수량 늘리기' : 'Increase quantity'}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <span className="text-sm font-bold">{formatMoney(item.lineTotal)}</span>
                  </div>
                </article>
              ))}

              <section className="pt-3">
                <label htmlFor="order-notes" className="text-sm font-bold">{labels.notes}</label>
                <textarea
                  maxLength={1000}
                  id="order-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={2}
                  placeholder={isKo ? '예: 덜 맵게 해주세요, 포크 2개 주세요' : 'Example: Less spicy, 2 forks please'}
                  className="mt-2 w-full resize-none rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm placeholder:text-neutral-400 focus:border-neutral-500"
                />
              </section>
            </div>

            <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_3px_14px_rgba(23,26,24,0.04)] sm:p-5 lg:sticky lg:top-6">
              <h2 className="text-base font-bold">{isKo ? '결제 요약' : 'Payment summary'}</h2>
              <dl className="mt-3 space-y-2 text-sm sm:mt-5 sm:space-y-3">
                <div className="flex justify-between text-neutral-600">
                  <dt>{labels.subtotal}</dt><dd>{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <dt>{labels.tax}</dt><dd>{formatMoney(tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-4 text-base font-bold">
                  <dt>{labels.total}</dt><dd>{formatMoney(total)}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={handleSendOrder}
                disabled={isSending}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#b4232b] px-4 text-sm font-bold text-white transition hover:bg-[#991b23] disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6"
              >
                <CreditCard size={18} />
                {isSending ? labels.sending : labels.pay}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-neutral-500">
                <LockKeyhole size={13} />
                {isKo ? 'Stripe 보안 결제' : 'Secure checkout powered by Stripe'}
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function formatTableName(table: string) {
  const tokenMatch = table.match(/_t(\d+)$/i);
  if (tokenMatch) return `T${tokenMatch[1]}`;
  return table || '-';
}
