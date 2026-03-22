import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock, Loader2, MessageSquare, Play, RefreshCw, Zap } from 'lucide-react';
import { listInProgressSessions, getProject, getRun, type InProgressItem } from './api';
import type { ProjectResponse, RunResponse } from './types';

interface InProgressViewProps {
  token: string;
  onResumeConversation: (sessionId: string) => void;
  onResumeProject: (project: ProjectResponse) => void;
  onResumeRun: (project: ProjectResponse, run: RunResponse) => void;
}

const STAGE_LABELS: Record<string, string> = {
  entry: 'Getting Started',
  classification: 'Analyzing Decision',
  clarification: 'Answering Questions',
  frame: 'Confirming Frame',
  agents: 'Setting Up Experts',
  ready: 'Ready to Generate',
  ready_to_run: 'Ready to Run Debate',
  queued: 'Debate Queued',
  running: 'Debate Running',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  conversation: MessageSquare,
  project: Zap,
  run: Play,
};

const TYPE_LABELS: Record<string, string> = {
  conversation: 'CONVERSATION',
  project: 'PROJECT READY',
  run: 'DEBATE',
};

const TYPE_COLORS: Record<string, string> = {
  conversation: '#5B7E91',
  project: '#CC5500',
  run: '#4caf7d',
};

function formatAge(isoDate: string | null): string {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function InProgressView({ token, onResumeConversation, onResumeProject, onResumeRun }: InProgressViewProps) {
  const [items, setItems] = useState<InProgressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const data = await listInProgressSessions(token);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [token]);

  async function handleResume(item: InProgressItem) {
    setResumingId(item.id);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session');
      setResumingId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111827', color: '#9E9E9E', gap: 12 }}>
        <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
        Loading sessions…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111827', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(91,126,145,0.2)', padding: '20px 24px', background: 'rgba(17,24,39,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>In Progress</h1>
          <p style={{ fontSize: 13, color: '#9E9E9E', margin: 0 }}>
            {items.length > 0 ? `${items.length} active session${items.length !== 1 ? 's' : ''}` : 'No active sessions'}
          </p>
        </div>
        <button
          onClick={loadItems}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(91,126,145,0.12)', border: '1px solid rgba(91,126,145,0.25)', borderRadius: 8, padding: '8px 14px', color: '#D6E4E8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(91,126,145,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(91,126,145,0.12)'}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ margin: '16px 24px 0', borderRadius: 10, border: '1px solid rgba(224,82,82,0.3)', background: 'rgba(224,82,82,0.08)', padding: '10px 16px', fontSize: 13, color: '#fca5a5', display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: '#64748b' }}>
            <Clock size={52} style={{ margin: '0 auto 16px', opacity: 0.25 }} />
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: '#94a3b8' }}>No sessions in progress</p>
            <p style={{ fontSize: 13 }}>Your active and paused sessions will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? MessageSquare;
              const typeColor = TYPE_COLORS[item.type] ?? '#9E9E9E';
              const isResuming = resumingId === item.id;
              const stageLabel = STAGE_LABELS[item.stage] ?? item.stage;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(91,126,145,0.2)',
                    borderRadius: 12,
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(91,126,145,0.35)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(91,126,145,0.2)';
                  }}
                >
                  {/* Type icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: typeColor }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: typeColor, background: `${typeColor}15`, padding: '2px 7px', borderRadius: 4 }}>
                        {TYPE_LABELS[item.type]}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{formatAge(item.updated_at)}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Progress bar */}
                      <div style={{ flex: 1, maxWidth: 160, background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: typeColor, borderRadius: 3, width: `${item.completeness}%`, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{stageLabel}</span>
                    </div>
                  </div>

                  {/* Resume button */}
                  <button
                    onClick={() => handleResume(item)}
                    disabled={isResuming || !!resumingId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      background: isResuming ? 'rgba(204,85,0,0.2)' : '#CC5500',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isResuming || resumingId ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.15s',
                      opacity: resumingId && !isResuming ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (!resumingId) e.currentTarget.style.background = '#b34a00'; }}
                    onMouseLeave={e => { if (!resumingId) e.currentTarget.style.background = isResuming ? 'rgba(204,85,0,0.2)' : '#CC5500'; }}
                  >
                    {isResuming ? (
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Play size={13} />
                    )}
                    {isResuming ? 'Opening…' : 'Resume'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
