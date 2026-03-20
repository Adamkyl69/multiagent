import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2, LogOut } from 'lucide-react';

import { supabase } from '../lib/supabase';
import AuthScreen from './AuthScreen';
import HomeScreen from './HomeScreen';
import ProjectReviewScreen from './ProjectReviewScreen';
import RunScreen from './RunScreen';
import { getMe } from './api';
import type { AuthMeResponse, ProjectResponse, RunResponse } from './types';

export default function ReleaseApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [run, setRun] = useState<RunResponse | null>(null);

  useEffect(() => {
    if (!supabase) {
      // Dev mode: bypass auth when Supabase is not configured
      setSession({ access_token: 'dev-token', user: { id: 'dev-user', email: 'dev@example.com' } } as any);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!mounted) {
        return;
      }
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProject(null);
      setRun(null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function syncProfile() {
      if (!session?.access_token) {
        setMe(null);
        return;
      }
      try {
        const profile = await getMe(session.access_token);
        setMe(profile);
        setError(null);
      } catch (caught) {
        // In dev mode, create a fake profile if backend auth fails
        if (!supabase && session.access_token === 'dev-token') {
          setMe({
            user_id: 'dev-user',
            email: 'dev@example.com',
            workspace_id: 'dev-workspace',
            workspace_name: 'Dev Workspace',
            plan_code: 'trial',
            subscription_status: 'trialing',
          });
        } else {
          setError(caught instanceof Error ? caught.message : 'Unable to load account context.');
        }
      }
    }

    syncProfile();
  }, [session?.access_token]);

  const token = session?.access_token ?? null;
  const workspaceLabel = useMemo(() => {
    if (!me) {
      return null;
    }
    return `${me.workspace_name} · ${me.plan_code}`;
  }, [me]);

  async function handleSignOut() {
    await supabase?.auth.signOut();
    setMe(null);
    setProject(null);
    setRun(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading session...
      </div>
    );
  }

  if (!token || !session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-300">Multi-Agent Debator</div>
            <div className="text-sm text-slate-400 mt-1">{workspaceLabel ?? 'Authenticating workspace...'}</div>
          </div>
          <div className="flex items-center gap-3">
            {me?.email ? <div className="text-sm text-slate-400">{me.email}</div> : null}
            <button onClick={handleSignOut} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold hover:border-indigo-500 inline-flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {error ? <div className="max-w-7xl mx-auto px-6 pt-6"><div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div></div> : null}

      {!project ? (
        <HomeScreen token={token} onProjectGenerated={setProject} />
      ) : run ? (
        <RunScreen token={token} project={project} initialRun={run} onBack={() => setRun(null)} />
      ) : (
        <ProjectReviewScreen token={token} project={project} onBack={() => setProject(null)} onProjectUpdated={setProject} onRunLaunched={setRun} />
      )}
    </div>
  );
}
