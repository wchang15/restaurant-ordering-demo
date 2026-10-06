import { createSupabaseServerClient } from './supabase-server';
import { reconcilePayment, type PaymentSession } from './payment-policy';

export async function settleCheckout(session: PaymentSession, failedEvent = false) {
  const db = createSupabaseServerClient();
  return reconcilePayment(session, {
    async load(id) {
      const { data, error } = await db.from('orders').select('id, total, payment_provider, payment_status, payment_session_id, order_number, status').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async compareAndSet(order, next) {
      const { data, error } = await db.from('orders').update({
        payment_status: next,
        ...(next === 'paid' ? { paid_at: new Date().toISOString(), ...(order.payment_status === 'failed' ? { status: 'NEW' } : {}) } : { status: 'CANCELLED' }),
      }).eq('id', order.id).eq('payment_provider', 'stripe').eq('payment_session_id', session.id)
        .eq('payment_status', order.payment_status).eq('total', order.total).eq('status', order.status).select('id').maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  }, failedEvent);
}
