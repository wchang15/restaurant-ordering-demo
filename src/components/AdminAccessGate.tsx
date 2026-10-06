'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { LockKeyhole, LogOut, Mail } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminFetch } from '@/lib/admin-client';

export default function AdminAccessGate({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [method, setMethod] = useState<'email' | 'password'>('email');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    let revision = 0;
    const check = async () => {
      const current = ++revision;
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (!session) {
          if (active && current === revision) { setAllowed(false); setError(''); }
          return;
        }
        await adminFetch('/api/admin/session');
        if (active && current === revision) { setAllowed(true); setError(''); }
      } catch (failure) {
        if (active && current === revision) {
          setAllowed(false);
          setError(failure instanceof Error ? failure.message : 'Access could not be verified.');
        }
      } finally {
        if (active && current === revision) setChecking(false);
      }
    };
    void check();
    // Defer auth calls outside the Supabase auth-state callback's internal lock.
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(() => {
      window.setTimeout(() => { if (active) void check(); }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { error: failure } = method === 'email'
        ? await supabaseBrowser.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/admin/orders`,
          },
        })
        : await supabaseBrowser.auth.signInWithPassword({ email: email.trim(), password });
      if (failure) throw failure;
      setPassword('');
      if (method === 'email') setNotice('Check your email for a sign-in link.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sign-in failed.');
    } finally { setBusy(false); }
  };

  if (checking) return <main className="grid min-h-screen place-items-center text-sm text-neutral-500">Checking access...</main>;
  if (allowed) return <>
    <div className="flex justify-end border-b border-neutral-200 bg-white px-6 py-2">
      <button type="button" onClick={() => { setAllowed(false); void supabaseBrowser.auth.signOut(); }}
        className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600">
        <LogOut size={14} /> Sign out
      </button>
    </div>
    {children}
  </>;

  return <main className="grid min-h-screen place-items-center bg-neutral-50 px-5 py-12">
    <form onSubmit={signIn} className="w-full max-w-sm space-y-5">
      <LockKeyhole className="text-[#b4232b]" size={28} />
      <h1 className="text-2xl font-bold">Staff sign in</h1>
      <div role="group" aria-label="Sign-in method" className="flex rounded-md border border-neutral-300 p-1">
        {(['email', 'password'] as const).map(value => <button key={value} type="button"
          aria-pressed={method === value} disabled={busy}
          onClick={() => { setMethod(value); setError(''); setNotice(''); setPassword(''); }}
          className={`flex-1 rounded px-3 py-2 text-sm font-semibold ${method === value ? 'bg-white shadow-sm' : 'text-neutral-500'}`}>
          {value === 'email' ? 'Email link' : 'Password'}
        </button>)}
      </div>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p role="status" className="text-sm text-green-800">{notice}</p> : null}
      <label className="block text-sm font-semibold">Email
        <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
          className="mt-2 h-12 w-full rounded-md border border-neutral-300 bg-white px-3 font-normal" />
      </label>
      {method === 'password' ? <label className="block text-sm font-semibold">Password
        <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
          className="mt-2 h-12 w-full rounded-md border border-neutral-300 bg-white px-3 font-normal" />
      </label> : null}
      <button disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#b4232b] font-semibold text-white disabled:opacity-60">
        {method === 'email' ? <Mail size={18} /> : <LockKeyhole size={18} />}
        {busy ? 'Please wait...' : method === 'email' ? 'Send sign-in link' : 'Sign in'}
      </button>
      <a href="/en/order?store=hanin&table=qr_hanin_t1" className="block text-center text-sm text-neutral-600 underline">Customer menu</a>
    </form>
  </main>;
}
