import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CreateOrderPayload } from '@/types/order';
import { AdminError, OrderStatus, validateStatusChange } from '@/lib/admin-policy';
import { getMenuPageData } from './menu-service';
import { CheckoutError, priceOrder } from './order-pricing';

type CreateOrderOptions = {
  paymentProvider?: string;
  paymentStatus?: 'pending' | 'paid' | 'pay_at_counter' | 'failed';
  paymentSessionId?: string;
  createDispatch?: boolean;
};

export async function createOrderFromPayload(
  payload: CreateOrderPayload,
  options: CreateOrderOptions = {}
) {
  const supabase = createSupabaseServerClient();

  if (!payload.items.length) {
    throw new Error('Cart is empty');
  }

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, slug')
    .eq('slug', payload.storeSlug)
    .single();

  if (storeError || !store) {
    throw new CheckoutError(400, 'Store not found');
  }

  const { data: tableRow, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('id, name, store_id')
    .eq('store_id', store.id)
    .eq('qr_token', payload.tableToken)
    .eq('active', true)
    .single();

  if (tableError || !tableRow) {
    throw new CheckoutError(400, 'Table not found');
  }

  const menu = await getMenuPageData(payload.storeSlug, payload.tableToken);
  const { items, subtotal, tax, total } = priceOrder(payload, menu.categories.flatMap((category) => category.items));

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      store_id: store.id,
      table_id: tableRow.id,
      customer_note: payload.customerNote || null,
      status: 'NEW',
      subtotal,
      tax,
      total,
      source: 'qr_web',
      locale: payload.locale,
      payment_provider: options.paymentProvider || 'counter',
      payment_status: options.paymentStatus || 'pay_at_counter',
      payment_session_id: options.paymentSessionId || null,
      paid_at: options.paymentStatus === 'paid' ? new Date().toISOString() : null,
    })
    .select('id, order_number')
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || 'Failed to create order');
  }

  const orderItems = items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    item_name_snapshot_en: item.name.en,
    item_name_snapshot_ko: item.name.ko,
    unit_price_snapshot: item.unitPrice,
    quantity: item.quantity,
    options_snapshot: item.options || [],
    line_total: item.lineTotal,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    throw new Error('Failed to save order items.');
  }

  if (options.createDispatch === true) {
    await createOrderDispatch(order.id, store.id, tableRow.name);
  }

  return {
    id: order.id,
    orderNumber: order.order_number as number,
    tableName: tableRow.name as string,
    subtotal,
    tax,
    total,
    items,
  };
}

export async function updateOrderPaymentSession(orderId: string, sessionId: string) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from('orders')
    .update({ payment_session_id: sessionId })
    .eq('id', orderId).eq('payment_status', 'pending').is('payment_session_id', null);

  if (error) throw new Error(error.message);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, expectedStatus: OrderStatus, storeIds: string[]) {
  const supabase = createSupabaseServerClient();
  if (!storeIds.length) throw new AdminError(403, 'No assigned stores.');
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, store_id, status, payment_status, restaurant_tables(name)')
    .eq('id', orderId)
    .in('store_id', storeIds)
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new AdminError(404, 'Order not found.');
  validateStatusChange(order.status as OrderStatus, status, expectedStatus, order.payment_status);

  if (order.status !== status) {
    // Compare-and-set prevents an older operator screen from overwriting a newer state.
    const { data: updated, error: updateError } = await supabase.from('orders')
      .update({ status }).eq('id', orderId).in('store_id', storeIds)
      .eq('status', expectedStatus).in('payment_status', ['paid', 'pay_at_counter'])
      .select('id').maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new AdminError(409, 'Order changed. Refresh and try again.');
  }

  if (status === 'ACCEPTED') {
    const tableRows = order.restaurant_tables as { name: string }[] | { name: string } | null;
    const tableName = Array.isArray(tableRows) ? tableRows[0]?.name : tableRows?.name;
    await createOrderDispatch(order.id as string, order.store_id as string, tableName || '');
  }
}

async function createOrderDispatch(orderId: string, storeId: string, tableName: string) {
  const supabase = createSupabaseServerClient();

  const { data: printers, error: printersError } = await supabase
    .from('kitchen_printers')
    .select('id')
    .eq('store_id', storeId)
    .eq('provider', 'star_cloudprnt')
    .eq('active', true);

  if (printersError) throw new Error(printersError.message);

  if (printers?.length) {
    const dispatches = printers.map((printer) => ({
      order_id: orderId,
      printer_id: printer.id,
      target_type: 'printer',
      provider: 'star_cloudprnt',
      status: 'pending',
      payload: { source: 'qr_web', tableName },
    }));

    const { error } = await supabase.from('order_dispatches').upsert(dispatches, {
      onConflict: 'order_id,printer_id,provider',
      ignoreDuplicates: true,
    });

    if (error) throw new Error(error.message);
    return;
  }

  const { data: existingDispatch } = await supabase
    .from('order_dispatches')
    .select('id')
    .eq('order_id', orderId)
    .eq('target_type', 'kds')
    .eq('provider', 'dummy')
    .maybeSingle();

  if (existingDispatch) return;

  const { error } = await supabase.from('order_dispatches').insert({
    order_id: orderId,
    target_type: 'kds',
    provider: 'dummy',
    status: 'pending',
    payload: { source: 'qr_web', tableName },
  });

  if (error) throw new Error(error.message);
}
