import type { CartItem, CreateOrderPayload } from '../types/order';
import type { MenuItem } from '../types/menu';

export class CheckoutError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function cents(value: number): number {
  const result = Math.round(value * 100);
  if (!Number.isFinite(value) || !Number.isSafeInteger(result) || Math.abs(value * 100 - result) > 0.000001) {
    throw new CheckoutError(400, 'Invalid monetary value.');
  }
  return result;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CheckoutError(400, 'Invalid order.');
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new CheckoutError(400, 'Invalid order field.');
  return value;
}

export function parseOrderPayload(input: unknown): CreateOrderPayload {
  const data = record(input);
  const storeSlug = text(data.storeSlug, 100);
  const tableToken = text(data.tableToken, 200);
  if (data.locale !== 'en' && data.locale !== 'ko') throw new CheckoutError(400, 'Invalid locale.');
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 50) throw new CheckoutError(400, 'Choose between 1 and 50 order lines.');
  let quantityTotal = 0;
  const items = data.items.map((raw): CartItem => {
    const item = record(raw);
    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new CheckoutError(400, 'Quantity must be between 1 and 100.');
    quantityTotal += quantity;
    if (typeof item.unitPrice !== 'number' || typeof item.lineTotal !== 'number' || cents(item.unitPrice) < 0 || cents(item.lineTotal) < 0) throw new CheckoutError(400, 'Invalid price quote.');
    const rawOptions = item.options ?? [];
    if (!Array.isArray(rawOptions) || rawOptions.length > 30) throw new CheckoutError(400, 'Invalid options.');
    return {
      menuItemId: text(item.menuItemId, 100), quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal,
      name: { en: '', ko: '' },
      options: rawOptions.map((rawOption) => {
        const option = record(rawOption);
        if (!option.groupId || !option.valueId) throw new CheckoutError(409, 'Menu options have changed. Remove this item and select it again from the menu.');
        return { groupId: text(option.groupId, 100), valueId: text(option.valueId, 100), group: { en: '', ko: '' }, value: { en: '', ko: '' }, priceDelta: 0 };
      }),
    };
  });
  if (quantityTotal > 200) throw new CheckoutError(400, 'An order can contain at most 200 items.');
  if (data.customerNote !== undefined && (typeof data.customerNote !== 'string' || data.customerNote.length > 1000)) throw new CheckoutError(400, 'Kitchen notes must be under 1,000 characters.');
  return { storeSlug, tableToken, locale: data.locale, items, customerNote: data.customerNote as string | undefined };
}

// Catalog entries come only from this store's active categories and menu items.
export function priceOrder(payload: CreateOrderPayload, catalog: MenuItem[]) {
  const items = payload.items.map((requested): CartItem => {
    const menu = catalog.find((entry) => entry.id === requested.menuItemId);
    if (!menu || menu.soldOut) throw new CheckoutError(409, 'An item is unavailable. Please choose it again from the menu.');
    const groups = menu.options ?? [];
    const seen = new Set<string>();
    const options = requested.options.map((selected) => {
      const group = groups.find((entry) => entry.id === selected.groupId);
      const value = group?.values.find((entry) => entry.id === selected.valueId);
      if (!group || !value || seen.has(value.id)) throw new CheckoutError(400, 'Invalid or repeated menu option.');
      seen.add(value.id);
      return { groupId: group.id, valueId: value.id, group: group.name, value: value.name, priceDelta: value.priceDelta };
    });
    for (const group of groups) {
      const count = options.filter((option) => option.groupId === group.id).length;
      if ((group.required && count === 0) || (!group.multiSelect && count > 1)) throw new CheckoutError(400, 'Please check required and single-choice options.');
    }
    const unitCents = cents(menu.price) + options.reduce((sum, option) => sum + cents(option.priceDelta), 0);
    const lineCents = unitCents * requested.quantity;
    if (unitCents < 0 || !Number.isSafeInteger(lineCents)) throw new CheckoutError(400, 'Invalid menu price.');
    // Never silently charge more than the amount the customer reviewed.
    if (cents(requested.unitPrice) !== unitCents || cents(requested.lineTotal) !== lineCents) throw new CheckoutError(409, 'Menu prices have changed. Remove this item and select it again to review the current total.');
    return { menuItemId: menu.id, name: menu.name, quantity: requested.quantity, unitPrice: unitCents / 100, options, lineTotal: lineCents / 100 };
  });
  const subtotalCents = items.reduce((sum, item) => sum + cents(item.lineTotal), 0);
  const taxCents = Math.round(subtotalCents / 10);
  if (subtotalCents < 1 || subtotalCents + taxCents > 999999) throw new CheckoutError(400, 'Order total is outside the supported range.');
  return { items, subtotal: subtotalCents / 100, tax: taxCents / 100, total: (subtotalCents + taxCents) / 100 };
}
