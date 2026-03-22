import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

import { supabase } from '../lib/supabase';
import AuthScreen from './AuthScreen';
import LandingPage from './LandingPage';
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
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  useEffect(() => {
    if (!supabase) {
      // In dev mode without supabase, start as logged out to test landing page
      setSession(null);
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
      <div style={{ minHeight: '100vh', background: '#06080F', color: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14, color: '#64748B' }}>Loading session...</span>
      </div>
    );
  }

  if (!token || !session) {
    if (showAuthScreen) {
      return (
        <AuthScreen
          onDevLogin={() => {
            setSession({ access_token: 'dev-token', user: { id: 'dev-user', email: 'dev@example.com' } } as any);
          }}
        />
      );
    }
    return (
      <LandingPage
        onSignIn={() => setShowAuthScreen(true)}
        onGetStarted={() => setShowAuthScreen(true)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#06080F', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.22,
          top: -200,
          left: -100,
        }} />
        <div style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #F97316 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.14,
          bottom: -150,
          right: 200,
        }} />
        <div style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
          filter: 'blur(80px)',
          opacity: 0.08,
          top: '40%',
          left: '38%',
        }} />
      </div>

      {/* Dot grid */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

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

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {error && (
          <div style={{ margin: '16px 24px 0', borderRadius: 10, border: '1px solid rgba(224,82,82,0.3)', background: 'rgba(224,82,82,0.08)', padding: '10px 16px', fontSize: 13, color: '#fca5a5' }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
