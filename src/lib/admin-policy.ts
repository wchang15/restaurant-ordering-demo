export class AdminError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type AdminAccess = { userId: string; storeIds: string[] };
type VerifiedUser = { id: string; app_metadata?: Record<string, unknown> };

export async function authorizeAdmin(
  authorization: string | null,
  verify: (token: string) => Promise<VerifiedUser | null>
): Promise<AdminAccess> {
  const match = /^Bearer ([^\s]+)$/i.exec(authorization || '');
  if (!match) throw new AdminError(401, 'Sign in to continue.');
  const user = await verify(match[1]);
  if (!user) throw new AdminError(401, 'Your session has expired. Sign in again.');
  // Only server-managed app_metadata grants access, never editable user_metadata.
  const stores = user.app_metadata?.admin_store_ids;
  if (!Array.isArray(stores) || !stores.length || !stores.every(isUuid)) {
    throw new AdminError(403, 'This account has no assigned stores.');
  }
  return { userId: user.id, storeIds: [...new Set(stores)] };
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export const orderStatuses = ['NEW', 'ACCEPTED', 'COOKING', 'READY', 'COMPLETED', 'CANCELLED'] as const;
export type OrderStatus = typeof orderStatuses[number];
export const nextOrderStatuses: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['READY'],
  COOKING: ['READY'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function parseStatusUpdate(body: unknown) {
  if (!body || typeof body !== 'object') throw new AdminError(400, 'Invalid order update.');
  const { orderId, status, expectedStatus } = body as Record<string, unknown>;
  const isStatus = (value: unknown): value is OrderStatus => orderStatuses.includes(value as OrderStatus);
  if (!isUuid(orderId) || !isStatus(status) || !isStatus(expectedStatus)) {
    throw new AdminError(400, 'Invalid order update.');
  }
  return { orderId, status, expectedStatus };
}

export function validateStatusChange(current: OrderStatus, next: OrderStatus, expected: OrderStatus, payment: string | null) {
  if (payment !== 'paid' && payment !== 'pay_at_counter') {
    throw new AdminError(409, 'This order is not ready for fulfillment.');
  }
  if (current === next) return;
  if (current !== expected) throw new AdminError(409, 'Order changed. Refresh and try again.');
  if (!nextOrderStatuses[current].includes(next)) {
    throw new AdminError(409, 'This order transition is not allowed.');
  }
}
