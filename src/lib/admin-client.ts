'use client';

import { supabaseBrowser } from '@/lib/supabase-browser';

export async function adminFetch(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  if (!session) throw new Error('Sign in to continue.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(path, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Request failed. Please try again.');
  }
  return response;
}
