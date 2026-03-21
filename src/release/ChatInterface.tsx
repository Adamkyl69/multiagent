import React, { useEffect, useRef, useState } from 'react';
import {
  generateProjectFromConversation,
  getConversation,
  sendConversationMessage,
  startConversation,
} from './api';
import type {
  CollectedContext,
  ConversationMessage,
  DecisionFrame,
  ProjectResponse,
} from './conversationTypes';

interface ChatInterfaceProps {
  token: string;
  onProjectGenerated: (project: ProjectResponse) => void;
  resumeSessionId?: string | null;
}

const getStageLabel = (stage: string): string => {
  const labels: Record<string, string> = {
    entry: 'Getting Started',
    classification: 'Analyzing',
    clarification: 'Understanding Your Decision',
    frame: 'Confirming Decision Frame',
    agents: 'Setting Up Experts',
    ready: 'Ready to Debate',
  };
  return labels[stage] || stage;
};

const getStakesBadgeColor = (stakes: string): string => {
  const colors: Record<string, string> = {
    low: 'bg-green-600',
    medium: 'bg-yellow-600',
    high: 'bg-orange-600',
    critical: 'bg-red-600',
  };
  return colors[stakes] || 'bg-slate-600';
};

export default function ChatInterface({ token, onProjectGenerated, resumeSessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<CollectedContext | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Resume an existing session on mount if resumeSessionId is provided
  useEffect(() => {
    if (!resumeSessionId) return;
    async function loadSession() {
      setResuming(true);
      setError(null);
      try {
        const history = await getConversation(token, resumeSessionId!);
        setSessionId(history.session_id);
        setMessages(history.messages as ConversationMessage[]);
        setContext(history.context as CollectedContext);
        setCanGenerate(history.can_generate);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resume session');
      } finally {
        setResuming(false);
      }
    }
    loadSession();
  }, [resumeSessionId]);

  const handleStart = async (initialMessage: string) => {
    if (!token || !initialMessage.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await startConversation(token, {
        initial_message: initialMessage,
      });

      setSessionId(response.session_id);
      setMessages([
        { id: 'user-initial', role: 'user', content: initialMessage, created_at: new Date().toISOString() },
        response.message,
      ]);
      setContext(response.context);
      setCanGenerate(response.can_generate);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!token || !sessionId || !input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: userMessage, created_at: new Date().toISOString() },
    ]);

    try {
      const response = await sendConversationMessage(token, sessionId, {
        content: userMessage,
      });

      setMessages((prev) => [...prev, response.message]);
      setContext(response.context);
      setCanGenerate(response.can_generate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    setInput(reply);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const handleGenerate = async () => {
    if (!token || !sessionId || !canGenerate) return;

    setGenerating(true);
    setError(null);

    try {
      const project = await generateProjectFromConversation(token, sessionId);
      onProjectGenerated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate project');
      setGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (sessionId) {
        handleSend();
      } else {
        handleStart(input);
      }
    }
  };

  const stakesBgColor = (stakes: string) => {
    const map: Record<string, string> = { low: '#4caf7d', medium: '#d4a017', high: '#CC5500', critical: '#e05252' };
    return map[stakes] || '#9E9E9E';
  };

  if (resuming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'transparent', color: '#64748B', gap: 12, flexDirection: 'column' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>Resuming your session…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'transparent', overflow: 'hidden' }}>
      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 40, maxWidth: 580, margin: '0 auto' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 24,
                padding: '8px 18px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: '#818CF8',
                marginBottom: 28,
              }}>
                <span style={{ fontSize: 16 }}>✦</span>
                DECISION INTELLIGENCE
              </div>
              <h1 style={{ 
                fontSize: 48, 
                fontWeight: 700, 
                color: '#F1F5F9', 
                margin: '0 0 20px', 
                lineHeight: 1.2,
                fontFamily: 'Space Grotesk, system-ui, sans-serif',
              }}>
                What decision are you facing?
              </h1>
              <p style={{ 
                fontSize: 15.5, 
                color: '#64748B', 
                margin: '0 0 48px', 
                lineHeight: 1.7,
                fontFamily: 'DM Sans, system-ui, sans-serif',
              }}>
                Describe your decision or dilemma. I'll ask a few targeted questions, frame it clearly, then assemble expert perspectives to help you decide.
              </p>
              
              <div style={{ textAlign: 'left', marginBottom: 24 }}>
                <p style={{ 
                  fontSize: 11, 
                  fontWeight: 600, 
                  letterSpacing: '0.08em', 
                  color: '#475569', 
                  marginBottom: 16,
                  textTransform: 'uppercase',
                }}>Quick Start Examples</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { num: '1', text: 'Should I quit my job and join this startup?' },
                    { num: '2', text: 'Which pricing model should I use for my SaaS?' },
                    { num: '3', text: 'Should I move to Berlin or stay in Stockholm?' },
                    { num: '4', text: 'Is this product idea worth pursuing?' },
                  ].map((ex) => (
                    <div
                      key={ex.num}
                      onClick={() => setInput(ex.text)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 180ms',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(99,102,241,0.15)',
                        color: '#818CF8',
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}>{ex.num}</span>
                      <span style={{ 
                        fontSize: 14, 
                        color: '#94A3B8',
                        fontFamily: 'DM Sans, system-ui, sans-serif',
                      }}>{ex.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: 720, margin: messages.length > 0 ? '0 auto' : '0', width: '100%' }}>
              <div style={{
                maxWidth: 600,
                borderRadius: 14,
                padding: '14px 18px',
                background: msg.role === 'user' ? 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)' : 'rgba(255,255,255,0.03)',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                color: '#F1F5F9',
                boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
              }}>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 14.5, lineHeight: 1.65, fontFamily: 'DM Sans, system-ui, sans-serif' }}>{msg.content}</p>

                {msg.role === 'system' && msg.metadata?.quick_replies && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    {msg.metadata.quick_replies.map((reply) => (
                      <button
                        key={reply}
                        onClick={() => handleQuickReply(reply)}
                        disabled={loading}
                        style={{
                          padding: '7px 14px',
                          fontSize: 13,
                          fontWeight: 500,
                          background: 'rgba(99,102,241,0.12)',
                          border: '1px solid rgba(99,102,241,0.25)',
                          borderRadius: 24,
                          color: '#A5B4FC',
                          cursor: 'pointer',
                          transition: 'all 180ms',
                          fontFamily: 'DM Sans, system-ui, sans-serif',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                        }}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}

                {msg.role === 'system' && msg.metadata?.suggestions?.agents && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {msg.metadata.suggestions.agents.map((agent, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: '#F1F5F9', fontFamily: 'DM Sans, system-ui, sans-serif' }}>{agent.name}</div>
                        <div style={{ color: '#94A3B8', marginTop: 3, fontSize: 13 }}>{agent.role}</div>
                        <div style={{ color: '#64748B', fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{agent.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', maxWidth: 720, margin: '0 auto', width: '100%' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 7, alignItems: 'center' }}>
                {[0, 150, 300].map((delay) => (
                  <span key={delay} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1', opacity: 0.7, animation: `pulse 1.2s ${delay}ms infinite` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.3)', borderRadius: 10, padding: '12px 18px', fontSize: 13.5, color: '#FCA5A5', maxWidth: 720, margin: '0 auto', width: '100%' }}>
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', background: 'rgba(11,14,26,0.8)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', gap: 12, maxWidth: 720, margin: '0 auto' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={sessionId ? 'Type your response...' : 'What decision do you need to make?'}
              disabled={loading || generating}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '13px 18px',
                fontSize: 14.5,
                color: '#F1F5F9',
                outline: 'none',
                fontFamily: 'DM Sans, system-ui, sans-serif',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
            />
            <button
              onClick={sessionId ? handleSend : () => handleStart(input)}
              disabled={!input.trim() || loading || generating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '13px 26px',
                background: !input.trim() || loading || generating ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                border: 'none',
                borderRadius: 12,
                color: !input.trim() || loading || generating ? '#475569' : '#fff',
                fontWeight: 600,
                fontSize: 14,
                cursor: !input.trim() || loading || generating ? 'not-allowed' : 'pointer',
                transition: 'all 180ms',
                fontFamily: 'DM Sans, system-ui, sans-serif',
                boxShadow: input.trim() && !loading && !generating ? '0 4px 12px rgba(99,102,241,0.25)' : 'none',
              }}
              onMouseEnter={e => { 
                if (input.trim() && !loading && !generating) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)';
                }
              }}
              onMouseLeave={e => { 
                if (input.trim() && !loading && !generating) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)';
                }
              }}
            >
              <span>Send</span>
              <span style={{ fontSize: 16 }}>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right context panel */}
      <div style={{ width: 300, background: 'rgba(11,14,26,0.6)', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, backdropFilter: 'blur(12px)' }}>
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#64748B', margin: '0 0 6px', textTransform: 'uppercase', fontFamily: 'DM Sans, system-ui, sans-serif' }}>Decision Analysis</h3>
          {context && (
            <div style={{ fontSize: 13, color: '#818CF8', fontWeight: 600, fontFamily: 'DM Sans, system-ui, sans-serif' }}>{getStageLabel(context.stage)}</div>
          )}
        </div>

        {!context && (
          <p style={{ fontSize: 13.5, color: '#64748B', margin: 0, fontFamily: 'DM Sans, system-ui, sans-serif' }}>Ask your question to get started.</p>
        )}

        {context && (
          <>
            {/* Classification badges */}
            {context.classification?.decision_type && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600, background: 'rgba(91,126,145,0.2)', color: '#D6E4E8', borderRadius: 5 }}>
                  {context.classification.decision_type}
                </span>
                {context.classification.stakes && (
                  <span style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600, background: stakesBgColor(context.classification.stakes), color: '#fff', borderRadius: 5 }}>
                    {context.classification.stakes} stakes
                  </span>
                )}
                {context.classification.complexity && (
                  <span style={{ padding: '3px 8px', fontSize: 11, fontWeight: 600, background: 'rgba(91,126,145,0.2)', color: '#D6E4E8', borderRadius: 5 }}>
                    {context.classification.complexity}
                  </span>
                )}
              </div>
            )}

            {/* Raw question */}
            {context.raw_question && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#9E9E9E', marginBottom: 6, textTransform: 'uppercase' }}>Your Question</div>
                <div style={{ fontSize: 13, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.5 }}>"{context.raw_question}"</div>
              </div>
            )}

            {/* Decision Frame */}
            {context.decision_frame?.decision_statement && (
              <div style={{ background: 'rgba(91,126,145,0.1)', border: '1px solid rgba(91,126,145,0.2)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#5B7E91', textTransform: 'uppercase' }}>Decision Frame</div>
                {[
                  { label: 'Decision', value: context.decision_frame.decision_statement },
                  { label: 'Objective', value: context.decision_frame.primary_objective },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: '#9E9E9E', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 }}>{value}</div>
                  </div>
                ) : null)}
                {context.decision_frame.alternatives?.length ? (
                  <div>
                    <div style={{ fontSize: 10, color: '#9E9E9E', marginBottom: 3 }}>Alternatives</div>
                    {context.decision_frame.alternatives.map((alt, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#e2e8f0' }}>• {alt}</div>
                    ))}
                  </div>
                ) : null}
                {context.decision_frame.constraints?.length ? (
                  <div>
                    <div style={{ fontSize: 10, color: '#9E9E9E', marginBottom: 3 }}>Constraints</div>
                    {context.decision_frame.constraints.map((c, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#e2e8f0' }}>• {c}</div>
                    ))}
                  </div>
                ) : null}
                {context.decision_frame.evaluation_criteria?.length ? (
                  <div>
                    <div style={{ fontSize: 10, color: '#9E9E9E', marginBottom: 3 }}>Criteria</div>
                    {context.decision_frame.evaluation_criteria.map((c, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#e2e8f0' }}>• {c}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* Agents */}
            {context.agents?.length ? (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#9E9E9E', textTransform: 'uppercase', marginBottom: 8 }}>
                  Expert Panel ({context.agents.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {context.agents.map((agent, idx) => (
                    <div key={idx} style={{ background: 'rgba(91,126,145,0.1)', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: agent.stance === 'pro' ? '#4caf7d' : agent.stance === 'con' ? '#e05252' : '#9E9E9E',
                      }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{agent.name}</div>
                        {agent.role && <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 2 }}>{agent.role}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Progress */}
            <div style={{ borderTop: '1px solid rgba(91,126,145,0.2)', paddingTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#9E9E9E', textTransform: 'uppercase', marginBottom: 8 }}>Progress</div>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#CC5500', borderRadius: 4, width: `${context.completeness}%`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 4 }}>{context.completeness}%</div>
            </div>

            {/* Start Debate button */}
            {canGenerate && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: generating ? 'rgba(255,255,255,0.06)' : '#CC5500',
                  border: 'none',
                  borderRadius: 10,
                  color: generating ? '#64748b' : '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!generating) e.currentTarget.style.background = '#b34a00'; }}
                onMouseLeave={e => { if (!generating) e.currentTarget.style.background = '#CC5500'; }}
              >
                {generating ? 'Starting Debate...' : '🚀 Start Debate'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
