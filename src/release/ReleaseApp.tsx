import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

import { supabase } from '../lib/supabase';
import AuthScreen from './AuthScreen';
import ChatInterface from './ChatInterface';
import ProjectReviewScreen from './ProjectReviewScreen';
import RunScreen from './RunScreen';
import Sidebar from './Sidebar';
import type { NavView, RecentSession } from './Sidebar';
import { getMe } from './api';
import type { AuthMeResponse, ProjectResponse, RunResponse } from './types';

export default function ReleaseApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [run, setRun] = useState<RunResponse | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setSession({ access_token: 'dev-token', user: { id: 'dev-user', email: 'dev@example.com' } } as any);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!mounted) return;
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

  // Track recent sessions when a project is generated or a run is launched
  useEffect(() => {
    if (project) {
      setRecentSessions((prev) => {
        const status: RecentSession['status'] = run
          ? run.status === 'running' || run.status === 'queued' ? 'running' : run.status === 'completed' ? 'completed' : 'failed'
          : 'framed';
        const next: RecentSession = { id: project.project_id, title: project.title, status };
        const filtered = prev.filter((s) => s.id !== project.project_id);
        return [next, ...filtered].slice(0, 5);
      });
    }
  }, [project, run?.status]);

  const token = session?.access_token ?? null;
  const workspaceLabel = useMemo(() => {
    if (!me) return undefined;
    return `${me.workspace_name} · ${me.plan_code}`;
  }, [me]);

  async function handleSignOut() {
    await supabase?.auth.signOut();
    setMe(null);
    setProject(null);
    setRun(null);
  }

  function handleNewDecision() {
    setProject(null);
    setRun(null);
    setResumeSessionId(null);
    setActiveView('dashboard');
  }

  function handleResumeConversation(sessionId: string) {
    setProject(null);
    setRun(null);
    setResumeSessionId(sessionId);
    setActiveView('dashboard');
  }

  function handleResumeProject(p: ProjectResponse) {
    setRun(null);
    setProject(p);
    setResumeSessionId(null);
    setActiveView('in-progress');
  }

  function handleResumeRun(p: ProjectResponse, r: RunResponse) {
    setProject(p);
    setRun(r);
    setResumeSessionId(null);
    setActiveView('in-progress');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f1117', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14, color: '#9E9E9E' }}>Loading session...</span>
      </div>
    );
  }

  if (!token || !session) {
    return <AuthScreen />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111827' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        activeView={activeView}
        onNavChange={setActiveView}
        onNewDecision={handleNewDecision}
        onSignOut={handleSignOut}
        email={me?.email}
        workspaceLabel={workspaceLabel}
        recentSessions={recentSessions}
        token={token}
        onResumeConversation={handleResumeConversation}
        onResumeProject={handleResumeProject}
        onResumeRun={handleResumeRun}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {error && (
          <div style={{ margin: '16px 24px 0', borderRadius: 10, border: '1px solid rgba(224,82,82,0.3)', background: 'rgba(224,82,82,0.08)', padding: '10px 16px', fontSize: 13, color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {project && run ? (
            <RunScreen token={token} project={project} initialRun={run} onBack={() => setRun(null)} />
          ) : project ? (
            <ProjectReviewScreen token={token} project={project} onBack={handleNewDecision} onProjectUpdated={setProject} onRunLaunched={setRun} />
          ) : (
            <ChatInterface
              token={token}
              resumeSessionId={resumeSessionId}
              onProjectGenerated={(p) => { setProject(p); setResumeSessionId(null); }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
