import { Locale, LocalizedText } from './menu';

export type CartOptionSelection = {
  groupId: string;
  valueId: string;
  group: LocalizedText;
  value: LocalizedText;
  priceDelta: number;
};

export type CartItem = {
  menuItemId: string;
  name: LocalizedText;
  quantity: number;
  unitPrice: number;
  options: CartOptionSelection[];
  lineTotal: number;
};

export type CreateOrderPayload = {
  storeSlug: string;
  tableToken: string;
  locale: Locale;
  customerNote?: string;
  appOrigin?: string;
  items: CartItem[];
};

export type AdminOrder = {
  id: string;
  order_number: number;
  status: 'NEW' | 'ACCEPTED' | 'COOKING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  payment_status?: 'pending' | 'paid' | 'pay_at_counter' | 'failed' | null;
  customer_note: string | null;
  total: number;
  created_at: string;
  restaurant_tables?: {
    name: string;
  }[] | { name: string } | null;
  order_items?: {
    id: string;
    item_name_snapshot_en: string;
    item_name_snapshot_ko: string;
    quantity: number;
    line_total: number;
    options_snapshot: CartOptionSelection[];
  }[];
};
