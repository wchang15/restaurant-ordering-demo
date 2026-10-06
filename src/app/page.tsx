import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/en/order?store=hanin&table=qr_hanin_t1');
}