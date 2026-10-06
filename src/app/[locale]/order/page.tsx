import { redirect } from 'next/navigation';

export default async function OrderStartPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ store?: string; table?: string }>;
}) {
  const { locale } = await params;
  const { store = 'hanin', table = 'qr_hanin_t1' } = await searchParams;
  redirect(`/${locale === 'ko' ? 'ko' : 'en'}/menu?${new URLSearchParams({ store, table })}`);
}
