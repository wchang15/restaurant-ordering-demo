'use client';

import Image from 'next/image';
import { ChevronUp, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CartBar from '@/components/CartBar';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MenuItemCard from '@/components/MenuItemCard';
import MenuItemModal from '@/components/MenuItemModal';
import { MenuCategory, MenuItem, Locale, LocalizedText } from '@/types/menu';
import { useCartStore } from '@/lib/cart-store';

export default function MenuClientPage({
  locale,
  store,
  table,
  tableName,
  storeName,
  categories,
}: {
  locale: Locale;
  store: string;
  table: string;
  tableName: string;
  storeName: LocalizedText;
  categories: MenuCategory[];
}) {
  const cartItems = useCartStore((state) => state.items);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const manualScrollRef = useRef(false);
  const manualScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems]
  );
  const restaurantName = storeName[locale] || storeName.en;

  const centerActiveTab = (categoryId: string) => {
    const container = tabsRef.current;
    const button = tabRefs.current[categoryId];
    if (!container || !button) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    container.scrollTo({
      left:
        container.scrollLeft +
        buttonRect.left -
        containerRect.left -
        containerRect.width / 2 +
        buttonRect.width / 2,
      behavior: 'smooth',
    });
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    centerActiveTab(categoryId);
    manualScrollRef.current = true;
    if (manualScrollTimeoutRef.current) clearTimeout(manualScrollTimeoutRef.current);

    const section = document.getElementById(`category-${categoryId}`);
    if (section) {
      const y = section.getBoundingClientRect().top + window.scrollY - 150;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }

    manualScrollTimeoutRef.current = setTimeout(() => {
      manualScrollRef.current = false;
    }, 900);
  };

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(`category-${category.id}`))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (manualScrollRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const id = visible.target.id.replace('category-', '');
        setActiveCategoryId(id);
        centerActiveTab(id);
      },
      { rootMargin: '-150px 0px -55% 0px', threshold: [0.1, 0.3, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      if (manualScrollTimeoutRef.current) clearTimeout(manualScrollTimeoutRef.current);
    };
  }, [categories]);

  return (
    <div className="min-h-screen bg-[#f5f6f3] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Image src="/hamjibak-logo.png" alt="Hahmjibach" width={150} height={63} className="h-auto w-[132px]" priority />
            <LanguageSwitcher currentLocale={locale} store={store} table={table} page="menu" />
          </div>

          <div className="mt-7 flex items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-[#b4232b]">
                {locale === 'ko' ? '테이블에서 바로 주문' : 'Order at your table'}
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-neutral-950 sm:text-3xl">
                {restaurantName}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-white">
              <MapPin size={15} aria-hidden="true" />
              <span className="text-xs font-semibold">
                {locale === 'ko' ? '테이블' : 'Table'} {tableName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {categories.length > 0 ? (
        <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
          <div
            ref={tabsRef}
            className="mx-auto max-w-3xl overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6"
          >
            <div className="flex min-w-max gap-6">
              {categories.map((category) => {
                const active = activeCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    ref={(node) => {
                      tabRefs.current[category.id] = node;
                    }}
                    type="button"
                    onClick={() => handleCategoryClick(category.id)}
                    className={`relative h-14 text-sm font-semibold transition ${
                      active ? 'text-neutral-950' : 'text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    {category.name[locale]}
                    <span
                      className={`absolute inset-x-0 bottom-0 h-0.5 bg-[#b4232b] transition-opacity ${
                        active ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-8 sm:px-6">
        <div className="space-y-10">
          {categories.map((category) => (
            <section key={category.id} id={`category-${category.id}`} className="scroll-mt-36">
              <div className="mb-4 flex items-end justify-between border-b border-neutral-300 pb-3">
                <h2 className="text-xl font-bold text-neutral-950">{category.name[locale]}</h2>
                <span className="text-xs font-medium text-neutral-500">
                  {category.items.length} {locale === 'ko' ? '개 메뉴' : category.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {category.items.map((item) => (
                  <MenuItemCard key={item.id} item={item} locale={locale} onOpen={setSelectedItem} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <CartBar
          href={`/${locale}/cart?store=${store}&table=${table}`}
          label={locale === 'ko' ? '주문 확인' : 'View order'}
          count={cartCount}
          amount={cartTotal}
        />

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={locale === 'ko' ? '맨 위로' : 'Back to top'}
          className={`fixed right-4 z-20 flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-md transition sm:right-8 ${
            showScrollTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
          }`}
          style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))' }}
        >
          <ChevronUp size={19} />
        </button>
      </main>

      <MenuItemModal
        key={selectedItem?.id ?? 'closed'}
        item={selectedItem}
        locale={locale}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
