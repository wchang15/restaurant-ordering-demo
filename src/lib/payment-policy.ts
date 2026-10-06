import { cents } from './order-pricing';

export type PaymentOrder = {
  id: string; total: number; payment_provider: string; payment_status: string;
  payment_session_id: string | null; order_number: number; status: string;
};
export type PaymentSession = {
  id: string; client_reference_id: string | null; metadata: Record<string, string> | null;
  payment_status: string; status: string | null; amount_total: number | null;
  currency: string | null; livemode: boolean; mode: string;
};
export type PaymentRepository = {
  load: (id: string) => Promise<PaymentOrder | null>;
  compareAndSet: (order: PaymentOrder, next: 'paid' | 'failed') => Promise<boolean>;
};

export async function reconcilePayment(session: PaymentSession, repository: PaymentRepository, failedEvent = false) {
  const orderId = session.metadata?.order_id;
  if (!orderId || orderId !== session.client_reference_id || session.livemode || session.mode !== 'payment') throw new Error('Invalid payment binding or mode.');
  const order = await repository.load(orderId);
  if (!order || order.payment_provider !== 'stripe' || order.payment_session_id !== session.id) throw new Error('Payment session is not bound to this order.');
  if (session.currency !== 'usd' || session.amount_total !== cents(Number(order.total))) throw new Error('Payment amount or currency mismatch.');
  const next = session.payment_status === 'paid' && session.status === 'complete' ? 'paid'
    : session.status === 'expired' || failedEvent ? 'failed' : null;
  // A delayed failure or duplicate event must never undo a settled order.
  if (!next || order.payment_status === 'paid' || order.payment_status === next) return order;
  if (!['pending', 'failed'].includes(order.payment_status)) throw new Error('Unsupported payment transition.');
  if (!await repository.compareAndSet(order, next)) {
    const latest = await repository.load(orderId);
    if (!latest || latest.payment_session_id !== session.id || cents(Number(latest.total)) !== session.amount_total || (latest.payment_status !== next && latest.payment_status !== 'paid')) throw new Error('Payment changed concurrently; retry reconciliation.');
    return latest;
  }
  return { ...order, payment_status: next };
}
