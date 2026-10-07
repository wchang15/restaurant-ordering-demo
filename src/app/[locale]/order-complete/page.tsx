import Link from 'next/link';
import Image from 'next/image';
import logo from '../../../../public/hamjibak-logo.png';
import { ArrowRight, Check } from 'lucide-react';
import { Locale } from '@/types/menu';
import ClearCartOnComplete from '@/components/ClearCartOnComplete';

export default async function OrderCompletePage({ params, searchParams }: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ orderNumber?: string; table?: string; store?: string; payment?: string }>;
}) {
  const { locale } = await params;
  const { orderNumber = '', table = '', store = 'hanin', payment = '' } = await searchParams;
  const isKo = locale === 'ko';
  return (
    <main className="min-h-screen bg-[#f5f6f3] px-5 py-16 text-neutral-950">
      <ClearCartOnComplete enabled={payment === 'paid'} />
      <div className="mx-auto max-w-md">
        <Image src={logo} alt="Hahm Ji Bach" className="mb-12 h-auto w-40" />
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><Check size={28} /></span>
        <h1 className="mt-6 text-3xl font-bold">{isKo ? '주문이 접수되었습니다' : 'Your order is in.'}</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">{isKo ? '직원이 주문을 확인하고 준비합니다.' : 'The team will review and prepare your order.'}</p>
        <dl className="my-8 flex justify-between gap-4 border-y border-neutral-300 py-6">
          <div><dt className="text-xs text-neutral-500">{isKo ? '주문번호' : 'Order number'}</dt><dd className="mt-2 text-2xl font-bold">#{orderNumber || '-'}</dd></div>
          <div className="text-right"><dt className="text-xs text-neutral-500">{isKo ? '테이블' : 'Table'}</dt><dd className="mt-2 text-2xl font-bold">{table || '-'}</dd></div>
        </dl>
        <Link href={`/${locale}/menu?${new URLSearchParams({ store, table })}`} className="flex h-14 items-center justify-between rounded-lg bg-neutral-950 px-5 text-sm font-bold text-white">
          {isKo ? '메뉴로 돌아가기' : 'Back to menu'}<ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
