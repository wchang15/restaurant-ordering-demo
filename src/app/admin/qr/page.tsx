'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { adminFetch } from '@/lib/admin-client';

type TableRow = {
  id: string;
  name: string;
  qr_token: string;
};

export default function AdminQrPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [storeName, setStoreName] = useState('hanin');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTables() {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('store') || 'hanin';
      setStoreName(slug);

      try {
        const response = await adminFetch(`/api/admin/tables?store=${encodeURIComponent(slug)}`);
        const data = await response.json();
        setTables(data.tables || []);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Tables could not be loaded.');
      }
    }
    loadTables();
  }, []);

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
  }, []);

  useEffect(() => {
    async function buildImages() {
      const nextImages: Record<string, string> = {};
      for (const table of tables) {
        const url = `${baseUrl}/en/order?store=${storeName}&table=${table.qr_token}`;
        nextImages[table.id] = await QRCode.toDataURL(url, { width: 360, margin: 2 });
      }
      setImages(nextImages);
    }
    if (tables.length && baseUrl) buildImages();
  }, [tables, baseUrl, storeName]);

  return (
    <main className="min-h-screen p-6">
      {error ? <p role="alert" className="mb-4 text-sm text-red-700">{error}</p> : null}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">QR Manager</h1>
        <a href="/admin/orders" className="rounded-xl border px-4 py-2">Orders</a>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {tables.map((table) => {
          const url = `${baseUrl}/en/order?store=${storeName}&table=${table.qr_token}`;
          return (
            <div key={table.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">{table.name}</h2>
              <p className="mt-1 break-all text-xs text-gray-500">{url}</p>
              {images[table.id] ? <Image src={images[table.id]} width={360} height={360} unoptimized alt={`${table.name} QR`} className="mx-auto mt-4 h-64 w-64" /> : null}
              <div className="mt-4 flex gap-2">
                <a href={url} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2 text-sm">Open</a>
                <a href={images[table.id]} download={`${table.name}.png`} className="rounded-xl border px-3 py-2 text-sm">Download</a>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
