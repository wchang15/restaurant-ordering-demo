import { createSupabaseServerClient } from '@/lib/supabase-server';

type CloudPrntPoll = {
  printerMAC?: string;
  statusCode?: string;
  printingInProgress?: boolean;
  jobToken?: string;
};

type KitchenPrinter = {
  id: string;
  store_id: string;
  active: boolean;
};

type DispatchRow = {
  id: string;
  order_id: string;
  payload?: { tableName?: string } | null;
};

type OrderRow = {
  id: string;
  order_number: number;
  customer_note: string | null;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  created_at: string;
  payment_status: string | null;
  restaurant_tables?: { name: string }[] | { name: string } | null;
  order_items?: OrderItemRow[];
};

type OrderItemRow = {
  item_name_snapshot_en: string;
  item_name_snapshot_ko: string;
  unit_price_snapshot: number | string;
  quantity: number;
  options_snapshot: unknown;
  line_total: number | string;
};

type OptionSnapshot = {
  groupName?: { en?: string; ko?: string };
  valueName?: { en?: string; ko?: string };
  priceDelta?: number;
};

export async function getCloudPrntPrinter(token: string) {
  const supabase = createSupabaseServerClient();
  const { data: printer, error } = await supabase
    .from('kitchen_printers')
    .select('id, store_id, active')
    .eq('cloudprnt_token', token)
    .eq('provider', 'star_cloudprnt')
    .single();

  if (error || !printer || !printer.active) return null;
  return printer as KitchenPrinter;
}

export async function recordCloudPrntPoll(printerId: string, poll: CloudPrntPoll) {
  const supabase = createSupabaseServerClient();
  const updates: Record<string, string> = {
    last_seen_at: new Date().toISOString(),
  };

  if (poll.printerMAC) updates.printer_mac = poll.printerMAC;

  await supabase.from('kitchen_printers').update(updates).eq('id', printerId);
}

export async function getNextCloudPrntJob(printerId: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('order_dispatches')
    .select('id, order_id, payload')
    .eq('printer_id', printerId)
    .eq('provider', 'star_cloudprnt')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as DispatchRow | null) || null;
}

export async function getCloudPrntTicket(printerId: string, jobToken: string) {
  const supabase = createSupabaseServerClient();
  const { data: dispatch } = await supabase
    .from('order_dispatches')
    .select('id, order_id, payload')
    .eq('id', jobToken)
    .eq('printer_id', printerId)
    .eq('provider', 'star_cloudprnt')
    .eq('status', 'pending')
    .maybeSingle();

  if (!dispatch) return null;

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_note,
      subtotal,
      tax,
      total,
      created_at,
      payment_status,
      restaurant_tables(name),
      order_items(
        item_name_snapshot_en,
        item_name_snapshot_ko,
        unit_price_snapshot,
        quantity,
        options_snapshot,
        line_total
      )
    `)
    .eq('id', (dispatch as DispatchRow).order_id)
    .single();

  if (error || !order) return null;

  return formatKitchenTicket(order as OrderRow, dispatch as DispatchRow);
}

export async function completeCloudPrntJob(printerId: string, jobToken: string, code: string) {
  const supabase = createSupabaseServerClient();
  const normalizedCode = decodeURIComponent(code || '200 OK');
  const printed = normalizedCode.startsWith('200');

  const { error } = await supabase
    .from('order_dispatches')
    .update({
      status: printed ? 'sent' : 'failed',
      last_error: printed ? null : normalizedCode,
      payload: {
        cloudprntCompletedAt: new Date().toISOString(),
        cloudprntCode: normalizedCode,
      },
    })
    .eq('id', jobToken)
    .eq('printer_id', printerId)
    .eq('provider', 'star_cloudprnt');

  if (error) throw new Error(error.message);
}

function formatKitchenTicket(order: OrderRow, dispatch: DispatchRow) {
  const tableRows = order.restaurant_tables;
  const tableName = Array.isArray(tableRows) ? tableRows[0]?.name : tableRows?.name;
  const lines = [
    center('KITCHEN ORDER'),
    repeat('=', 32),
    `Order #${order.order_number}`,
    `Table: ${dispatch.payload?.tableName || tableName || '-'}`,
    `Paid: ${order.payment_status === 'paid' ? 'CARD' : 'COUNTER'}`,
    `Time: ${formatDate(order.created_at)}`,
    repeat('-', 32),
  ];

  for (const item of order.order_items || []) {
    lines.push(`${item.quantity}x ${item.item_name_snapshot_en}`);
    if (item.item_name_snapshot_ko && item.item_name_snapshot_ko !== item.item_name_snapshot_en) {
      lines.push(`   ${item.item_name_snapshot_ko}`);
    }

    for (const option of normalizeOptions(item.options_snapshot)) {
      const groupName = option.groupName?.en || option.groupName?.ko;
      const valueName = option.valueName?.en || option.valueName?.ko;
      if (groupName || valueName) {
        lines.push(`   - ${[groupName, valueName].filter(Boolean).join(': ')}`);
      }
    }
  }

  if (order.customer_note) {
    lines.push(repeat('-', 32), 'NOTE', order.customer_note);
  }

  lines.push(
    repeat('-', 32),
    `Subtotal ${formatMoney(order.subtotal)}`,
    `Tax      ${formatMoney(order.tax)}`,
    `Total    ${formatMoney(order.total)}`,
    repeat('=', 32),
    '\n\n'
  );

  return lines.join('\n');
}

function normalizeOptions(value: unknown): OptionSnapshot[] {
  return Array.isArray(value) ? (value as OptionSnapshot[]) : [];
}

function formatMoney(value: number | string) {
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function center(value: string) {
  const width = 32;
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return `${' '.repeat(left)}${value}`;
}

function repeat(value: string, count: number) {
  return value.repeat(count);
}
