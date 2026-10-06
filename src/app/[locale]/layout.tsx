import { Locale } from '@/types/menu';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // 🔥 여기 수정
}) {
  const { locale } = await params;

  // 🔥 안전하게 변환
  const safeLocale: Locale = locale === 'ko' ? 'ko' : 'en';

  return <div data-locale={safeLocale}>{children}</div>;
}