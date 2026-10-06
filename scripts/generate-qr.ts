import QRCode from 'qrcode';
import fs from 'node:fs/promises';

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const entries = [
    { name: 'T1', token: 'qr_hanin_t1' },
    { name: 'T2', token: 'qr_hanin_t2' },
    { name: 'T3', token: 'qr_hanin_t3' },
  ];

  await fs.mkdir('./public/qrs', { recursive: true });
  for (const entry of entries) {
    const url = `${baseUrl}/en/order?store=hanin&table=${entry.token}`;
    await QRCode.toFile(`./public/qrs/${entry.name}.png`, url, { width: 400, margin: 2 });
  }
}

main().catch(console.error);
