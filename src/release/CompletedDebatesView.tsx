import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, DollarSign, Loader2, MessageSquare } from 'lucide-react';
import { listCompletedDebates, getFullDebateDetails, type CompletedDebateListItem, type FullDebateDetails } from './api';

interface CompletedDebatesViewProps {
  token: string;
}

export default function CompletedDebatesView({ token }: CompletedDebatesViewProps) {
  const [debates, setDebates] = useState<CompletedDebateListItem[]>([]);
  const [selectedDebate, setSelectedDebate] = useState<FullDebateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDebates() {
      try {
        setLoading(true);
        const data = await listCompletedDebates(token);
        setDebates(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load completed debates');
      } finally {
        setLoading(false);
      }
    }
    loadDebates();
  }, [token]);

  async function handleSelectDebate(runId: string) {
    try {
      setDetailLoading(true);
      const details = await getFullDebateDetails(token, runId);
      setSelectedDebate(details);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load debate details');
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111827', color: '#9E9E9E', gap: 12 }}>
        <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
        Loading completed debates...
      </div>
    );
  }

  if (selectedDebate) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111827', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(91,126,145,0.2)', padding: '16px 24px', background: 'rgba(17,24,39,0.95)' }}>
          <button
            onClick={() => setSelectedDebate(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(91,126,145,0.15)',
              border: '1px solid rgba(91,126,145,0.3)',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#D6E4E8',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            <ArrowLeft size={16} />
            Back to list
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>{selectedDebate.project_title}</h1>
          <p style={{ fontSize: 13, color: '#9E9E9E', margin: 0 }}>{selectedDebate.project_objective}</p>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Agents */}
          {selectedDebate.agents.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#5B7E91', textTransform: 'uppercase', marginBottom: 12 }}>
                Expert Panel ({selectedDebate.agents.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {selectedDebate.agents.map((agent: any, idx: number) => (
                  <div key={idx} style={{ background: 'rgba(91,126,145,0.08)', border: '1px solid rgba(91,126,145,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{agent.name}</div>
                    <div style={{ fontSize: 12, color: '#9E9E9E', marginBottom: 6 }}>{agent.role}</div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{agent.purpose}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#5B7E91', textTransform: 'uppercase', marginBottom: 12 }}>
              Debate Transcript ({selectedDebate.transcript.length} messages)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selectedDebate.transcript.map((msg) => (
                <div key={msg.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(91,126,145,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#CC5500', background: 'rgba(204,85,0,0.12)', padding: '3px 8px', borderRadius: 4 }}>
                      {msg.phase_name}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{msg.speaker_name}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>#{msg.sequence}</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final Output */}
          {selectedDebate.final_output && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#5B7E91', textTransform: 'uppercase', marginBottom: 12 }}>
                Final Synthesis
              </h2>
              <div style={{ background: 'rgba(91,126,145,0.08)', border: '1px solid rgba(91,126,145,0.2)', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#9E9E9E', textTransform: 'uppercase', marginBottom: 6 }}>Summary</div>
                  <p style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>{selectedDebate.final_output.summary}</p>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#9E9E9E', textTransform: 'uppercase', marginBottom: 6 }}>Verdict</div>
                  <p style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>{selectedDebate.final_output.verdict}</p>
                </div>
                {selectedDebate.final_output.recommendations.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#9E9E9E', textTransform: 'uppercase', marginBottom: 6 }}>Recommendations</div>
                    <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 }}>
                      {selectedDebate.final_output.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111827', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(91,126,145,0.2)', padding: '20px 24px', background: 'rgba(17,24,39,0.95)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>Completed Debates</h1>
        <p style={{ fontSize: 13, color: '#9E9E9E', margin: 0 }}>View past debate transcripts and final recommendations</p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '16px 24px 0', borderRadius: 10, border: '1px solid rgba(224,82,82,0.3)', background: 'rgba(224,82,82,0.08)', padding: '10px 16px', fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {debates.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#64748b' }}>
            <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No completed debates yet</p>
            <p style={{ fontSize: 13 }}>Start a new decision to see completed debates here</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {debates.map((debate) => (
              <button
                key={debate.run_id}
                onClick={() => handleSelectDebate(debate.run_id)}
                disabled={detailLoading}
                style={{
                  background: 'rgba(91,126,145,0.08)',
                  border: '1px solid rgba(91,126,145,0.2)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  textAlign: 'left',
                  cursor: detailLoading ? 'wait' : 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!detailLoading) {
                    e.currentTarget.style.background = 'rgba(91,126,145,0.15)';
                    e.currentTarget.style.borderColor = 'rgba(91,126,145,0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(91,126,145,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(91,126,145,0.2)';
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>{debate.project_title}</h3>
                
                {debate.summary && (
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {debate.summary}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} />
                    {new Date(debate.completed_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DollarSign size={12} />
                    ${(debate.actual_cost_cents / 100).toFixed(2)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
