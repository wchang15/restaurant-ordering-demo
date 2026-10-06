import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  MenuCategory,
  MenuItem,
  MenuOptionGroup,
  MenuOptionValue,
  MenuPageData,
} from '@/types/menu';

export async function getMenuPageData(
  storeSlug: string,
  tableToken: string
): Promise<MenuPageData> {
  const supabase = createSupabaseServerClient();

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name_en, name_ko, slug')
    .eq('slug', storeSlug)
    .single();

  if (storeError || !store) {
    throw new Error(`Store not found: ${storeSlug}`);
  }

  let tableRow: {
    id: string;
    name: string;
    qr_token?: string | null;
    active?: boolean | null;
  } | null = null;

  const { data: tableByToken, error: tableTokenError } = await supabase
    .from('restaurant_tables')
    .select('id, name, qr_token, active')
    .eq('store_id', store.id)
    .eq('qr_token', tableToken)
    .maybeSingle();

  if (tableTokenError) {
    throw new Error(`Table lookup failed by qr_token: ${tableTokenError.message}`);
  }

  if (tableByToken) {
    tableRow = tableByToken;
  } else {
    const { data: tableByName, error: tableNameError } = await supabase
      .from('restaurant_tables')
      .select('id, name, qr_token, active')
      .eq('store_id', store.id)
      .eq('name', tableToken)
      .maybeSingle();

    if (tableNameError) {
      throw new Error(`Table lookup failed by name: ${tableNameError.message}`);
    }

    if (tableByName) {
      tableRow = tableByName;
    }
  }

  if (!tableRow) {
    throw new Error(`Table not found | store=${storeSlug} | table=${tableToken}`);
  }

  if (tableRow.active !== true) {
    throw new Error(
      `Table is inactive | store=${storeSlug} | table=${tableToken} | matchedTable=${tableRow.name}`
    );
  }

  const { data: categoryRows, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name_en, name_ko, sort_order')
    .eq('store_id', store.id)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (categoriesError) throw new Error(categoriesError.message);

  const { data: itemRows, error: itemsError } = await supabase
    .from('menu_items')
    .select(
      'id, category_id, name_en, name_ko, description_en, description_ko, price, image_url, video_url, sold_out, sort_order'
    )
    .eq('store_id', store.id)
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  const itemIds = (itemRows || []).map((row) => row.id);
  let optionGroupRows: any[] = [];
  let optionValueRows: any[] = [];

  if (itemIds.length) {
    const { data: groupRows, error: groupsError } = await supabase
      .from('menu_option_groups')
      .select(
        'id, menu_item_id, name_en, name_ko, required, multi_select, sort_order'
      )
      .in('menu_item_id', itemIds)
      .order('sort_order', { ascending: true });

    if (groupsError) throw new Error(groupsError.message);
    optionGroupRows = groupRows || [];

    const groupIds = optionGroupRows.map((row) => row.id);
    if (groupIds.length) {
      const { data: valueRows, error: valuesError } = await supabase
        .from('menu_option_values')
        .select(
          'id, option_group_id, name_en, name_ko, price_delta, sort_order'
        )
        .in('option_group_id', groupIds)
        .order('sort_order', { ascending: true });

      if (valuesError) throw new Error(valuesError.message);
      optionValueRows = valueRows || [];
    }
  }

  const valuesByGroup = new Map<string, MenuOptionValue[]>();
  optionValueRows.forEach((row) => {
    const value: MenuOptionValue = {
      id: row.id,
      name: { en: row.name_en, ko: row.name_ko },
      priceDelta: Number(row.price_delta),
    };
    const existing = valuesByGroup.get(row.option_group_id) || [];
    existing.push(value);
    valuesByGroup.set(row.option_group_id, existing);
  });

  const groupsByItem = new Map<string, MenuOptionGroup[]>();
  optionGroupRows.forEach((row) => {
    const group: MenuOptionGroup = {
      id: row.id,
      name: { en: row.name_en, ko: row.name_ko },
      required: row.required,
      multiSelect: row.multi_select,
      values: valuesByGroup.get(row.id) || [],
    };
    const existing = groupsByItem.get(row.menu_item_id) || [];
    existing.push(group);
    groupsByItem.set(row.menu_item_id, existing);
  });

  const itemsByCategory = new Map<string, MenuItem[]>();
  (itemRows || []).forEach((row) => {
    const item: MenuItem = {
      id: row.id,
      categoryId: row.category_id,
      name: { en: row.name_en, ko: row.name_ko },
      description: {
        en: row.description_en || '',
        ko: row.description_ko || '',
      },
      price: Number(row.price),
      imageUrl: row.image_url,
      videoUrl: row.video_url,
      soldOut: row.sold_out,
      options: groupsByItem.get(row.id) || [],
    };
    const existing = itemsByCategory.get(row.category_id) || [];
    existing.push(item);
    itemsByCategory.set(row.category_id, existing);
  });

  const categories: MenuCategory[] = (categoryRows || []).map((row) => ({
    id: row.id,
    name: { en: row.name_en, ko: row.name_ko },
    items: itemsByCategory.get(row.id) || [],
  }));

  return {
    storeName: { en: store.name_en, ko: store.name_ko },
    tableName: tableRow.name,
    tableToken: tableRow.qr_token || tableToken,
    categories,
  };
}
