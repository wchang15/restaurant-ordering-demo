import MenuClientPage from '@/components/MenuClientPage';
import { getMenuPageData } from '@/lib/menu-service';
import { Locale } from '@/types/menu';

export default async function MenuPage({ params, searchParams }: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ store?: string; table?: string }>;
}) {
  const { locale } = await params;
  const { store = 'hanin', table = '' } = await searchParams;
  const data = await getMenuPageData(store, table);

  return (
    <MenuClientPage
      locale={locale}
      store={store}
      table={data.tableToken}
      tableName={data.tableName}
      storeName={data.storeName}
      categories={data.categories}
    />
  );
}
