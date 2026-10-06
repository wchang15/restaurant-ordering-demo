import { Banknote, Check, ChevronRight, Clock3, CreditCard, X } from 'lucide-react';
import { ReactNode } from 'react';
import { AdminOrder } from '@/types/order';
import { formatMoney } from '@/lib/utils';

const columnStyles: Record<
  AdminOrder['status'],
  { label: string; accent: string; badge: string; empty: string }
> = {
  NEW: {
    label: 'New orders',
    accent: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-800',
    empty: 'No orders waiting',
  },
  ACCEPTED: {
    label: 'Preparing',
    accent: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    empty: 'Nothing in preparation',
  },
  COOKING: {
    label: 'Preparing',
    accent: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    empty: 'Nothing in preparation',
  },
  READY: {
    label: 'Ready',
    accent: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    empty: 'No orders ready',
  },
  COMPLETED: {
    label: 'Completed',
    accent: 'bg-neutral-400',
    badge: 'bg-neutral-200 text-neutral-700',
    empty: 'No completed orders yet',
  },
  CANCELLED: {
    label: 'Cancelled',
    accent: 'bg-red-500',
    badge: 'bg-red-100 text-red-800',
    empty: 'No cancelled orders',
  },
};

const actionLabels: Record<AdminOrder['status'], string> = {
  NEW: 'Move to new',
  ACCEPTED: 'Accept order',
  COOKING: 'Start preparing',
  READY: 'Mark ready',
  COMPLETED: 'Complete order',
  CANCELLED: 'Decline',
};

export default function OrderColumn({
  title,
  orders,
  statuses,
  footer,
  updatingOrderId,
  onChangeStatus,
}: {
  title: AdminOrder['status'];
  orders: AdminOrder[];
  statuses: AdminOrder['status'][];
  footer?: ReactNode;
  updatingOrderId?: string | null;
  onChangeStatus: (id: string, status: AdminOrder['status']) => void;
}) {
  const style = columnStyles[title];
  const primaryStatus = statuses.find((status) => status !== 'CANCELLED');
  const canCancel = statuses.includes('CANCELLED');

  return (
    <section className="min-w-0 bg-[#eef0ed] p-3">
      <div className={`mb-3 h-1 w-10 rounded-full ${style.accent}`} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-neutral-950">{style.label}</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {orders.length === 1 ? '1 ticket' : `${orders.length} tickets`}
          </p>
        </div>
        <span className={`flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-xs font-bold ${style.badge}`}>
          {orders.length}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center border border-dashed border-neutral-300 bg-white/55 px-4 text-center text-xs font-medium text-neutral-400">
          {style.empty}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isUpdating = updatingOrderId === order.id;
            return (
              <article
                key={order.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 shadow-[0_3px_12px_rgba(23,26,24,0.05)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xl leading-none text-neutral-950">#{order.order_number}</strong>
                      <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-bold text-neutral-700">
                        Table {getTableName(order)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] font-medium text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={13} /> {formatElapsedTime(order.created_at)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {order.payment_status === 'paid' ? <CreditCard size={13} /> : <Banknote size={13} />}
                        {order.payment_status === 'paid' ? 'Card paid' : 'Pay at counter'}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-neutral-950">
                    {formatMoney(Number(order.total))}
                  </span>
                </div>

                {order.customer_note ? (
                  <p className="mt-3 border-l-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
                    {order.customer_note}
                  </p>
                ) : null}

                {order.order_items?.length ? (
                  <div className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="grid grid-cols-[24px_1fr_auto] gap-2 py-2.5 text-sm">
                        <span className="font-bold text-neutral-500">{item.quantity}x</span>
                        <div className="min-w-0">
                          <p className="font-semibold leading-5 text-neutral-900">{item.item_name_snapshot_en}</p>
                          {item.item_name_snapshot_ko ? (
                            <p className="text-xs text-neutral-400">{item.item_name_snapshot_ko}</p>
                          ) : null}
                          {Array.isArray(item.options_snapshot) && item.options_snapshot.length ? (
                            <p className="mt-1 text-[11px] leading-4 text-neutral-500">
                              {item.options_snapshot.map((option) => option.value.en).join(', ')}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-xs font-semibold text-neutral-500">
                          {formatMoney(Number(item.line_total))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {primaryStatus || canCancel ? (
                  <div className="mt-4 flex gap-2">
                    {primaryStatus ? (
                      <button
                        type="button"
                        disabled={!!updatingOrderId}
                        onClick={() => onChangeStatus(order.id, primaryStatus)}
                        className="flex h-10 flex-1 items-center justify-between rounded-lg bg-neutral-950 px-3 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          {primaryStatus === 'COMPLETED' ? <Check size={15} /> : null}
                          {isUpdating ? 'Updating...' : actionLabels[primaryStatus]}
                        </span>
                        {primaryStatus !== 'COMPLETED' ? <ChevronRight size={15} /> : null}
                      </button>
                    ) : null}
                    {canCancel ? (
                      <button
                        type="button"
                        disabled={!!updatingOrderId}
                        onClick={() => onChangeStatus(order.id, 'CANCELLED')}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        aria-label="Decline order"
                        title="Decline order"
                      >
                        <X size={17} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}

function formatElapsedTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes >= 1440) return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function getTableName(order: AdminOrder) {
  const table = order.restaurant_tables;
  if (Array.isArray(table)) return table[0]?.name || '-';
  return table?.name || '-';
}
