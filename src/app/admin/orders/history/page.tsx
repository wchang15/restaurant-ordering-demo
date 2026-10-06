'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin-client';
import { formatMoney } from '@/lib/utils';
import { AdminOrder } from '@/types/order';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
      const response = await adminFetch('/api/admin/orders');
      const { orders: data } = await response.json();
      if (mounted && data) {
        setOrders((data as AdminOrder[]).filter((order) => !['pending', 'failed'].includes(order.payment_status || '')));
      }
      } catch (failure) {
        if (mounted) setError(failure instanceof Error ? failure.message : 'Orders could not be loaded.');
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedOrders = useMemo(
    () => orders.filter((order) => toDateInputValue(new Date(order.created_at)) === selectedDate),
    [orders, selectedDate]
  );

  const completedSelectedOrders = selectedOrders.filter(
    (order) => order.status === 'COMPLETED' && order.payment_status !== 'pending'
  );
  const selectedRevenue = completedSelectedOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const selectedCancelled = selectedOrders.filter((order) => order.status === 'CANCELLED').length;

  const moveDate = (days: number) => {
    const next = new Date(`${selectedDate}T00:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(toDateInputValue(next));
  };

  return (
    <main className="min-h-screen bg-[#f5f2ec] px-4 py-5 text-gray-950 sm:px-6">
      {error ? <p role="alert" className="mb-4 text-sm text-red-700">{error}</p> : null}
      <div className="mb-5 flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">Hahm Ji Bach</p>
          <h1 className="mt-1 text-4xl font-black text-gray-950">Order History</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            onClick={() => moveDate(-1)}
          >
            Previous Day
          </button>
          <input
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <button
            className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            onClick={() => moveDate(1)}
          >
            Next Day
          </button>
          <button
            className="rounded-md border border-black/10 bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black"
            onClick={() => setSelectedDate(toDateInputValue(new Date()))}
          >
            Today
          </button>
          <a
            href="/admin/orders"
            className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to Dashboard
          </a>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-black/10 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Selected Date Revenue</p>
          <p className="mt-1 text-3xl font-black">{formatMoney(selectedRevenue)}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Selected Date Orders</p>
          <p className="mt-1 text-3xl font-black">{selectedOrders.length}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-500">Cancelled</p>
          <p className="mt-1 text-3xl font-black">{selectedCancelled}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
        <div className="grid grid-cols-[90px_1fr_120px_120px_120px] gap-3 border-b border-black/10 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500">
          <span>Order</span>
          <span>Table</span>
          <span>Status</span>
          <span>Total</span>
          <span>Time</span>
        </div>
        <div className="divide-y divide-gray-100">
          {selectedOrders.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-[90px_1fr_120px_120px_120px] gap-3 px-4 py-3 text-sm"
            >
              <strong>#{order.order_number}</strong>
              <span>{getTableName(order)}</span>
              <span className={statusClassName(order)}>{getStatusLabel(order)}</span>
              <span className="font-semibold">{formatMoney(Number(order.total))}</span>
              <span className="text-gray-500">{formatDate(order.created_at)}</span>
            </div>
          ))}
          {selectedOrders.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">
              No orders for this date.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function statusClassName(order: AdminOrder) {
  const base = 'w-fit rounded-md px-2 py-1 text-xs font-semibold';
  if (order.payment_status === 'pending') return `${base} bg-gray-100 text-gray-500`;
  if (order.status === 'COMPLETED') return `${base} bg-emerald-100 text-emerald-800`;
  if (order.status === 'CANCELLED') return `${base} bg-red-100 text-red-700`;
  if (order.status === 'ACCEPTED') return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-sky-100 text-sky-800`;
}

function getStatusLabel(order: AdminOrder) {
  if (order.payment_status === 'pending') return 'PENDING';
  return order.status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getTableName(order: AdminOrder) {
  const table = order.restaurant_tables;
  if (Array.isArray(table)) return table[0]?.name || '-';
  return table?.name || '-';
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
