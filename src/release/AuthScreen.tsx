import React, { useMemo, useState } from 'react';
import { Loader2, Lock, Mail, UserPlus } from 'lucide-react';

import { IS_SUPABASE_CONFIGURED } from '../lib/env';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ onDevLogin }: { onDevLogin?: () => void }) {
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const heading = useMemo(
    () => (mode === 'sign_in' ? 'Sign in to your workspace' : 'Create your account'),
    [mode],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase client configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const action =
      mode === 'sign_in'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error: authError } = await action;
    if (authError) {
      setError(authError.message);
    } else if (mode === 'sign_up') {
      setMessage('Check your email to verify your account, then sign in.');
    }

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-8">
        <div className="space-y-3 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Multi-Agent Debator</h1>
          <p className="text-slate-400 text-sm font-medium">{heading}</p>
        </div>

        {!IS_SUPABASE_CONFIGURED && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 space-y-3">
            <div>Frontend auth configuration is missing. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.</div>
            {onDevLogin && (
              <button
                type="button"
                onClick={onDevLogin}
                className="w-full rounded-xl bg-amber-600/20 border border-amber-500/50 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-600/30 transition-colors"
              >
                Continue as Developer (Mock Session)
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Email</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
              <Mail className="w-4 h-4 text-slate-500" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                className="w-full bg-transparent outline-none text-sm"
                placeholder="you@company.com"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Password</span>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
              <Lock className="w-4 h-4 text-slate-500" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                minLength={8}
                className="w-full bg-transparent outline-none text-sm"
                placeholder="Minimum 8 characters"
              />
            </div>
          </label>

          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{message}</div>}

          <button
            type="submit"
            disabled={submitting || !IS_SUPABASE_CONFIGURED}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {mode === 'sign_in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((current) => (current === 'sign_in' ? 'sign_up' : 'sign_in'))}
          className="w-full text-sm text-slate-400 hover:text-white"
        >
          {mode === 'sign_in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
