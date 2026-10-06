'use client';

import { History, QrCode, RefreshCw, Store, Wifi, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OrderColumn from '@/components/OrderColumn';
import { adminFetch } from '@/lib/admin-client';
import { nextOrderStatuses } from '@/lib/admin-policy';
import { formatMoney } from '@/lib/utils';
import { AdminOrder } from '@/types/order';

const columns: AdminOrder['status'][] = ['NEW', 'ACCEPTED', 'READY', 'COMPLETED'];

const nextStatuses = nextOrderStatuses;

function localDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);
  const [clearedCompletedIds, setClearedCompletedIds] = useState<string[]>([]);
  const [clearedCancelledIds, setClearedCancelledIds] = useState<string[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connected, setConnected] = useState(false);
  const [statusError, setStatusError] = useState('');
  const updateInFlight = useRef(false);

  const todayKey = localDateKey(new Date().toISOString());
  const todayOrders = useMemo(
    () => orders.filter((order) => localDateKey(order.created_at) === todayKey),
    [orders, todayKey]
  );
  const activeOrders = orders.filter(
    (order) => order.status !== 'COMPLETED' && order.status !== 'CANCELLED'
  );
  const cancelledOrders = todayOrders.filter(
    (order) => order.status === 'CANCELLED' && !clearedCancelledIds.includes(order.id)
  );
  const completedOrders = todayOrders.filter(
    (order) => order.status === 'COMPLETED' && !clearedCompletedIds.includes(order.id)
  );
  const paidOrdersToday = todayOrders.filter((order) => order.payment_status === 'paid');
  const salesToday = paidOrdersToday.reduce((sum, order) => sum + Number(order.total), 0);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
    const response = await adminFetch('/api/admin/orders');
    const { orders: data } = await response.json();
    if (data) {
      setLoadError('');
      setOrders(
        (data as AdminOrder[]).filter(
          (order) => order.payment_status !== 'pending' && order.payment_status !== 'failed'
        )
      );
      setLastUpdated(new Date());
      setConnected(true);
    }
    } catch (error) {
      setConnected(false);
      setOrders([]);
      setLoadError(error instanceof Error ? error.message : 'Orders could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const refresh = window.setInterval(loadOrders, 5000);

    return () => {
      window.clearInterval(refresh);
    };
  }, [loadOrders]);

  useEffect(() => {
    for (const [key, setter] of [
      ['cleared-completed-order-ids', setClearedCompletedIds],
      ['cleared-cancelled-order-ids', setClearedCancelledIds],
    ] as const) {
      try {
        const value = JSON.parse(window.localStorage.getItem(key) || '[]');
        if (Array.isArray(value)) setter(value.filter((id) => typeof id === 'string'));
      } catch {
        // Ticket visibility remains usable when browser storage is unavailable.
      }
    }
  }, []);

  const updateStatus = async (id: string, nextStatus: AdminOrder['status']) => {
    if (updateInFlight.current) return;
    updateInFlight.current = true;
    setUpdatingOrderId(id);
    setStatusError('');
    try {
    const current = orders.find(order => order.id === id);
    if (!current) throw new Error('Order not found. Refresh and try again.');
    const response = await adminFetch('/api/admin/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id, status: nextStatus, expectedStatus: current.status }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error || 'Failed to update order.');
    }
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status: nextStatus } : order));
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Connection lost. Please retry the order update.');
      void loadOrders();
    } finally {
      updateInFlight.current = false;
      setUpdatingOrderId(null);
    }
  };

  const clearCompleted = () => {
    const nextIds = Array.from(new Set([...clearedCompletedIds, ...completedOrders.map((order) => order.id)]));
    setClearedCompletedIds(nextIds);
    try { window.localStorage.setItem('cleared-completed-order-ids', JSON.stringify(nextIds)); } catch {}
  };

  const clearCancelled = () => {
    const nextIds = Array.from(new Set([...clearedCancelledIds, ...cancelledOrders.map((order) => order.id)]));
    setClearedCancelledIds(nextIds);
    try { window.localStorage.setItem('cleared-cancelled-order-ids', JSON.stringify(nextIds)); } catch {}
  };

  const ordersForColumn = (column: AdminOrder['status']) => {
    if (column === 'ACCEPTED') {
      return orders.filter((order) => order.status === 'ACCEPTED' || order.status === 'COOKING');
    }
    if (column === 'COMPLETED') return completedOrders;
    return orders.filter((order) => order.status === column);
  };

  return (
    <main className="min-h-screen bg-[#f5f6f3] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#b4232b] text-white">
              <Store size={20} />
            </span>
            <div>
              <p className="text-xs font-semibold text-neutral-500">Hahm Ji Bach</p>
              <h1 className="text-xl font-bold">Order operations</h1>
            </div>
            <span className={`ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold ${connected && !loadError ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
              <Wifi size={12} /> {loadError ? 'Offline' : connected ? 'Connected' : 'Connecting'}
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-2" aria-label="Order dashboard actions">
            <button
              type="button"
              onClick={() => setShowCancelled((current) => !current)}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                showCancelled
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <XCircle size={16} /> Cancelled {cancelledOrders.length}
            </button>
            <a
              href="/admin/orders/history"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              <History size={16} /> History
            </a>
            <a
              href="/admin/qr?store=hanin"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              <QrCode size={16} /> QR tables
            </a>
            <button
              type="button"
              onClick={loadOrders}
              disabled={isLoading}
              title="Refresh orders"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              aria-label="Refresh orders"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <section className="mb-5 grid border border-neutral-200 bg-white sm:grid-cols-3">
          <Metric label="Open tickets" value={String(activeOrders.length)} detail="Across all active stages" />
          <Metric label="Paid orders today" value={String(paidOrdersToday.length)} detail={`${todayOrders.length} total orders`} />
          <Metric label="Card sales today" value={formatMoney(salesToday)} detail="Confirmed Stripe payments" />
        </section>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Live service board</h2>
            <p className="mt-1 text-xs text-neutral-500">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Connecting to order feed'}
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{loadError}</span>
            <button type="button" onClick={loadOrders} className="font-bold underline">Try again</button>
          </div>
        ) : null}

        {statusError ? <p role="alert" className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{statusError}</p> : null}

        {showCancelled ? (
          <div className="mb-4 max-w-sm">
            <OrderColumn
              title="CANCELLED"
              orders={cancelledOrders}
              statuses={[]}
              updatingOrderId={updatingOrderId}
              footer={
                cancelledOrders.length ? (
                  <button
                    type="button"
                    className="h-10 w-full rounded-lg border border-red-200 bg-white text-xs font-bold text-red-700 hover:bg-red-50"
                    onClick={clearCancelled}
                  >
                    Clear cancelled
                  </button>
                ) : null
              }
              onChangeStatus={updateStatus}
            />
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <OrderColumn
              key={column}
              title={column}
              orders={ordersForColumn(column)}
              statuses={nextStatuses[column]}
              updatingOrderId={updatingOrderId}
              footer={
                column === 'COMPLETED' && completedOrders.length ? (
                  <button
                    type="button"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                    onClick={clearCompleted}
                  >
                    Clear completed
                  </button>
                ) : null
              }
              onChangeStatus={updateStatus}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-neutral-200 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
      <p className="mt-1 text-[11px] text-neutral-400">{detail}</p>
    </div>
  );
}
