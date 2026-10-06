import Link from 'next/link';
import { Locale } from '@/types/menu';

type Props = {
  store: string;
  table: string;
  currentLocale: Locale;
  page: 'order' | 'menu' | 'cart';
  theme?: 'light' | 'dark';
};

export default function LanguageSwitcher({
  store,
  table,
  currentLocale,
  page,
  theme = 'light',
}: Props) {
  const baseClass = 'inline-flex h-9 items-center justify-center px-3 text-xs font-semibold transition';
  const activeClass = theme === 'dark' ? 'bg-white text-neutral-950' : 'bg-neutral-950 text-white';
  const inactiveClass = theme === 'dark'
    ? 'text-white/70 hover:text-white'
    : 'text-neutral-500 hover:text-neutral-950';

  return (
    <div
      className={`inline-flex overflow-hidden rounded-lg border p-0.5 ${
        theme === 'dark' ? 'border-white/20 bg-black/30' : 'border-neutral-200 bg-neutral-100'
      }`}
      aria-label="Language"
    >
      <Link
        href={`/en/${page}?store=${store}&table=${table}`}
        className={`${baseClass} rounded-md ${currentLocale === 'en' ? activeClass : inactiveClass}`}
      >
        English
      </Link>

      <Link
        href={`/ko/${page}?store=${store}&table=${table}`}
        className={`${baseClass} rounded-md ${currentLocale === 'ko' ? activeClass : inactiveClass}`}
      >
        한국어
      </Link>
    </div>
  );
}
