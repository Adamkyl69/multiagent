import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Search,
  Star,
  FileText,
  BarChart2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Zap,
  Play,
} from 'lucide-react';
import { listInProgressSessions, listCompletedDebates, getProject, getRun, type InProgressItem, type CompletedDebateListItem } from './api';
import type { ProjectResponse, RunResponse } from './types';

export interface RecentSession {
  id: string;
  title: string;
  status: 'debating' | 'framed' | 'ready' | 'completed' | 'running' | 'failed';
}

export type NavView = 'dashboard' | 'in-progress' | 'completed' | 'starred';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeView: NavView;
  onNavChange: (view: NavView) => void;
  onNewDecision: () => void;
  onSignOut: () => void;
  email?: string;
  workspaceLabel?: string;
  recentSessions?: RecentSession[];
  token: string;
  onResumeConversation: (sessionId: string) => void;
  onResumeProject: (project: ProjectResponse) => void;
  onResumeRun: (project: ProjectResponse, run: RunResponse) => void;
}

const STATUS_COLORS: Record<RecentSession['status'], string> = {
  debating: '#CC5500',
  running: '#CC5500',
  framed: '#5B7E91',
  ready: '#5B7E91',
  completed: '#4caf7d',
  failed: '#e05252',
};

const STATUS_LABELS: Record<RecentSession['status'], string> = {
  debating: 'DEBATING',
  running: 'RUNNING',
  framed: 'FRAMED',
  ready: 'READY',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

const NAV_ITEMS: { id: NavView; label: string; Icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'DASHBOARD', Icon: LayoutDashboard },
  { id: 'in-progress', label: 'IN PROGRESS', Icon: Clock },
  { id: 'completed', label: 'COMPLETED', Icon: CheckCircle },
  { id: 'starred', label: 'STARRED', Icon: Star },
];

const STATIC_ITEMS: { label: string; Icon: React.ElementType }[] = [
  { label: 'SEARCH', Icon: Search },
  { label: 'TEMPLATES', Icon: FileText },
  { label: 'REPORTS', Icon: BarChart2 },
];

export default function Sidebar({
  collapsed,
  onToggle,
  activeView,
  onNavChange,
  onNewDecision,
  onSignOut,
  email,
  workspaceLabel,
  recentSessions = [],
  token,
  onResumeConversation,
  onResumeProject,
  onResumeRun,
}: SidebarProps) {
  const [inProgressItems, setInProgressItems] = useState<InProgressItem[]>([]);
  const [loadingInProgress, setLoadingInProgress] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [completedItems, setCompletedItems] = useState<CompletedDebateListItem[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);
  const [completedDisplayCount, setCompletedDisplayCount] = useState(6);

  const sidebarBg = '#5B7E91';
  const activeBg = 'rgba(255,255,255,0.12)';
  const hoverBg = 'rgba(255,255,255,0.07)';

  useEffect(() => {
    loadInProgressSessions();
    loadCompletedRuns();
  }, [token]);

  async function loadInProgressSessions() {
    setLoadingInProgress(true);
    try {
      const items = await listInProgressSessions(token);
      setInProgressItems(items);
    } catch (err) {
      console.error('Failed to load in-progress sessions:', err);
    } finally {
      setLoadingInProgress(false);
    }
  }

  async function loadCompletedRuns() {
    setLoadingCompleted(true);
    try {
      const items = await listCompletedDebates(token, 50);
      setCompletedItems(items);
    } catch (err) {
      console.error('Failed to load completed runs:', err);
    } finally {
      setLoadingCompleted(false);
    }
  }

  async function handleResumeCompleted(item: CompletedDebateListItem) {
    setResumingId(item.run_id);
    try {
      const [project, run] = await Promise.all([
        getProject(token, item.project_id),
        getRun(token, item.run_id),
      ]);
      onResumeRun(project, run);
    } catch (err) {
      console.error('Failed to resume completed run:', err);
    } finally {
      setResumingId(null);
    }
  }

  async function handleResumeItem(item: InProgressItem) {
    setResumingId(item.id);
    try {
      if (item.type === 'conversation') {
        onResumeConversation(item.id);
      } else if (item.type === 'project' && item.project_id) {
        const project = await getProject(token, item.project_id);
        onResumeProject(project);
      } else if (item.type === 'run' && item.project_id && item.run_id) {
        const [project, run] = await Promise.all([
          getProject(token, item.project_id),
          getRun(token, item.run_id),
        ]);
        onResumeRun(project, run);
      }
      // Session resumed successfully
    } catch (err) {
      console.error('Failed to resume session:', err);
    } finally {
      setResumingId(null);
    }
  }

  const TYPE_ICONS: Record<string, React.ElementType> = {
    conversation: MessageSquare,
    project: Zap,
    run: Play,
  };

  const TYPE_COLORS: Record<string, string> = {
    conversation: '#5B7E91',
    project: '#CC5500',
    run: '#4caf7d',
  };

  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        background: sidebarBg,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.2s ease, min-width 0.2s ease',
        overflow: 'hidden',
        zIndex: 30,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: collapsed ? '20px 0' : '20px 20px 12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          minHeight: 72,
        }}
      >
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              Decision Intelligence
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.18em', fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>
              {workspaceLabel ?? 'MULTI-AGENT DEBATOR'}
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            flexShrink: 0,
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* New Decision button */}
      <div style={{ padding: collapsed ? '14px 10px' : '14px 16px' }}>
        <button
          onClick={onNewDecision}
          style={{
            background: '#CC5500',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.06em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            padding: collapsed ? '10px' : '11px 14px',
            width: '100%',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#b34a00')}
          onMouseLeave={e => (e.currentTarget.style.background = '#CC5500')}
          title="New Decision"
        >
          <PlusCircle size={16} />
          {!collapsed && 'NEW DECISION'}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflow: 'hidden auto', padding: collapsed ? '4px 6px' : '4px 10px' }}>
        {NAV_ITEMS.filter(item => item.id !== 'in-progress' && item.id !== 'completed').map(({ id, label, Icon }) => {
          const isActive = activeView === id;
          
          return (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              title={label}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: isActive ? activeBg : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid #CC5500' : '3px solid transparent',
                borderRadius: isActive ? '0 6px 6px 0' : 6,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                marginBottom: 2,
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
              {!collapsed && label}
            </button>
          );
        })}

        {/* In Progress List */}
        {!collapsed && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <div style={{ padding: '10px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)' }}>
              IN PROGRESS
            </div>
            {loadingInProgress ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                Loading...
              </div>
            ) : inProgressItems.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                No active sessions
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 6, paddingRight: 6 }}>
                {inProgressItems.slice(0, 5).map((item) => {
                  const ItemIcon = TYPE_ICONS[item.type] || MessageSquare;
                  const typeColor = TYPE_COLORS[item.type] || '#9E9E9E';
                  const isResuming = resumingId === item.id;

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleResumeItem(item)}
                      disabled={isResuming || !!resumingId}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        cursor: isResuming || resumingId ? 'not-allowed' : 'pointer',
                        fontSize: 11,
                        fontWeight: 600,
                        textAlign: 'left',
                        transition: 'background 0.12s',
                        opacity: resumingId && !isResuming ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (!resumingId) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                      onMouseLeave={e => { if (!resumingId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    >
                      <ItemIcon size={13} style={{ color: typeColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Completed List */}
        {!collapsed && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <div style={{ padding: '10px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)' }}>
              COMPLETED
            </div>
            {loadingCompleted ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                Loading...
              </div>
            ) : completedItems.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                No completed sessions
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 6, paddingRight: 6 }}>
                  {completedItems.slice(0, completedDisplayCount).map((item) => {
                    const isResuming = resumingId === item.run_id;

                    return (
                      <button
                        key={item.run_id}
                        onClick={() => handleResumeCompleted(item)}
                        disabled={isResuming || !!resumingId}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.05)',
                          border: 'none',
                          borderRadius: 6,
                          color: '#fff',
                          cursor: isResuming || resumingId ? 'not-allowed' : 'pointer',
                          fontSize: 11,
                          fontWeight: 600,
                          textAlign: 'left',
                          transition: 'background 0.12s',
                          opacity: resumingId && !isResuming ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { if (!resumingId) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { if (!resumingId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      >
                        <CheckCircle size={13} style={{ color: '#4caf7d', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.project_title}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {completedItems.length > completedDisplayCount && (
                  <button
                    onClick={() => setCompletedDisplayCount(prev => prev + 6)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      marginTop: 6,
                      marginLeft: 6,
                      marginRight: 6,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 6,
                      color: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    }}
                  >
                    LOAD MORE
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

        {STATIC_ITEMS.map(({ label, Icon }) => (
          <button
            key={label}
            title={label}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '10px' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'transparent',
              border: 'none',
              borderLeft: '3px solid transparent',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              marginBottom: 2,
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = hoverBg;
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
            }}
          >
            <Icon size={16} strokeWidth={1.8} />
            {!collapsed && label}
          </button>
        ))}
      </nav>

      {/* Recent Sessions */}
      {!collapsed && recentSessions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '14px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
            RECENT SESSIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSessions.slice(0, 3).map((s) => (
              <div key={s.id}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.title}
                </div>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#fff',
                  background: STATUS_COLORS[s.status],
                  borderRadius: 4,
                  padding: '2px 6px',
                }}>
                  {STATUS_LABELS[s.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer: email + sign out */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: collapsed ? '12px 0' : '12px 16px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 8 }}>
        {!collapsed && email && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </div>
        )}
        <button
          onClick={onSignOut}
          title="Sign out"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 6,
            color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 30,
            height: 30,
            flexShrink: 0,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
