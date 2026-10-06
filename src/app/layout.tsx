import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QR Ordering',
  description: 'Bilingual restaurant QR ordering app',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'QR Ordering', statusBarStyle: 'default' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
