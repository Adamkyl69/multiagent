import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, ArrowUp, Sparkles, MessageSquare, Wrench } from 'lucide-react';
import InlineDecisionWizard from './InlineDecisionWizard';
import InlineDecisionResults from './InlineDecisionResults';
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
import type { RankingResult } from './types';

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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isTypingAnimation, setIsTypingAnimation] = useState(true);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [decisionMode, setDecisionMode] = useState<'exploration' | 'structured' | null>(null);
  const [rankingResult, setRankingResult] = useState<RankingResult | null>(null);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Close tools menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => prev + (prev ? ' ' : '') + transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing animation for example questions in input field
  useEffect(() => {
    if (messages.length > 0 || !isTypingAnimation) return;

    const examples = [
      'Should I quit my job and join this startup?',
      'Which pricing model should I use for my SaaS?',
      'Should I move to Berlin or stay in Stockholm?',
      'Is this product idea worth pursuing?',
    ];

    const currentExample = examples[currentExampleIndex];
    let charIndex = 0;

    const typeNextChar = () => {
      if (charIndex < currentExample.length) {
        setInput(currentExample.substring(0, charIndex + 1));
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, 50);
      } else {
        typingTimeoutRef.current = setTimeout(() => {
          setCurrentExampleIndex((prev) => (prev + 1) % examples.length);
          setInput('');
        }, 2000);
      }
    };

    typingTimeoutRef.current = setTimeout(typeNextChar, 500);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentExampleIndex, messages.length, isTypingAnimation]);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    <>
      <div style={{ display: 'flex', height: '100vh', background: 'transparent', overflow: 'hidden' }}>
        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Hero Section */}
              <div style={{ textAlign: 'center', maxWidth: 580, margin: '0 auto', width: '100%', padding: '60px 24px 40px' }}>
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
                  Let's help you decide
                </h1>
                <p style={{ 
                  fontSize: 15.5, 
                  color: '#64748B', 
                  margin: '0', 
                  lineHeight: 1.7,
                  fontFamily: 'DM Sans, system-ui, sans-serif',
                }}>
                  Describe your decision or dilemma. I'll ask a few targeted questions, frame it clearly, then assemble expert perspectives to help you decide.
                </p>
              </div>

              {/* Input bar below hero */}
              <div style={{ padding: '0 24px 20px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <textarea
                        value={input}
                        onChange={(e) => {
                          setIsTypingAnimation(false);
                          setInput(e.target.value);
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder={sessionId ? 'Type your response...' : 'What decision do you need to make?'}
                        disabled={loading || generating}
                        rows={1}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          padding: '13px 18px',
                          paddingRight: speechSupported ? '80px' : '50px',
                          fontSize: 14.5,
                          color: '#F1F5F9',
                          outline: 'none',
                          fontFamily: 'DM Sans, system-ui, sans-serif',
                          resize: 'none',
                          minHeight: '46px',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          lineHeight: '1.5',
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(99,102,241,0.5) rgba(255,255,255,0.05)',
                        }}
                        onFocus={e => {
                          setIsTypingAnimation(false);
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }}
                        onBlur={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = Math.min(target.scrollHeight, 150) + 'px';
                        }}
                      />
                      <button
                        onClick={sessionId ? handleSend : () => handleStart(input)}
                        disabled={!input.trim() || loading || generating}
                        style={{
                          position: 'absolute',
                          right: speechSupported ? '44px' : '12px',
                          bottom: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          background: !input.trim() || loading || generating ? 'transparent' : '#6366F1',
                          border: 'none',
                          borderRadius: '50%',
                          color: !input.trim() || loading || generating ? '#475569' : '#fff',
                          cursor: !input.trim() || loading || generating ? 'not-allowed' : 'pointer',
                          transition: 'all 180ms',
                          padding: 0,
                        }}
                        onMouseEnter={e => {
                          if (input.trim() && !loading && !generating) {
                            e.currentTarget.style.background = '#818CF8';
                          }
                        }}
                        onMouseLeave={e => {
                          if (input.trim() && !loading && !generating) {
                            e.currentTarget.style.background = '#6366F1';
                          }
                        }}
                        title="Send message"
                      >
                        <ArrowUp size={18} />
                      </button>
                      {speechSupported && (
                        <button
                          onClick={toggleSpeechRecognition}
                          disabled={loading || generating}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            bottom: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '50%',
                            color: isListening ? '#EF4444' : '#64748B',
                            cursor: loading || generating ? 'not-allowed' : 'pointer',
                            transition: 'all 180ms',
                            padding: 0,
                          }}
                          onMouseEnter={e => {
                            if (!loading && !generating) {
                              e.currentTarget.style.color = isListening ? '#DC2626' : '#94A3B8';
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (!loading && !generating) {
                              e.currentTarget.style.color = isListening ? '#EF4444' : '#64748B';
                              e.currentTarget.style.background = 'transparent';
                            }
                          }}
                          title={isListening ? 'Stop recording' : 'Start voice input'}
                        >
                          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              overflowX: 'hidden',
              padding: '40px 24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 20,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(99,102,241,0.5) rgba(255,255,255,0.05)',
            }}>
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


            {/* Inline MAGDM wizard */}
            {decisionMode === 'structured' && !rankingResult && context?.decision_frame && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', maxWidth: 720, margin: '0 auto', width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <InlineDecisionWizard
                    token={token}
                    title={context.decision_frame.title || 'Decision'}
                    problemStatement={context.decision_frame.problem_statement || ''}
                    domain={context.decision_frame.domain || 'general'}
                    onComplete={(ranking) => {
                      setRankingResult(ranking);
                      scrollToBottom();
                    }}
                    onCancel={() => {
                      setDecisionMode(null);
                      scrollToBottom();
                    }}
                  />
                </div>
              </div>
            )}

            {/* Inline MAGDM results */}
            {rankingResult && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', maxWidth: 720, margin: '0 auto', width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <InlineDecisionResults ranking={rankingResult} />
                </div>
              </div>
            )}

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

            {/* Input bar at bottom for active chat */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', background: 'rgba(11,14,26,0.8)', backdropFilter: 'blur(12px)' }}>
              <div style={{ display: 'flex', gap: 12, maxWidth: 720, margin: '0 auto', alignItems: 'flex-end' }}>
                {/* Tools button */}
                <div style={{ position: 'relative' }} ref={toolsMenuRef}>
                  <button
                    onClick={() => setShowToolsMenu(!showToolsMenu)}
                    disabled={loading || generating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 14px',
                      background: showToolsMenu ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${showToolsMenu ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10,
                      color: showToolsMenu ? '#A5B4FC' : '#64748B',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: loading || generating ? 'not-allowed' : 'pointer',
                      transition: 'all 180ms',
                      fontFamily: 'DM Sans, system-ui, sans-serif',
                    }}
                    onMouseEnter={e => {
                      if (!loading && !generating && !showToolsMenu) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!showToolsMenu) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      }
                    }}
                  >
                    <Wrench style={{ width: 16, height: 16 }} />
                    <span>Tools</span>
                  </button>

                  {/* Tools dropdown menu */}
                  {showToolsMenu && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: 8,
                      background: 'rgba(17,24,39,0.95)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: '8px',
                      minWidth: 280,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 1000,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', padding: '8px 12px', marginBottom: 4 }}>Decision Mode</div>
                      <button
                        onClick={() => {
                          setDecisionMode('exploration');
                          setRankingResult(null);
                          setShowToolsMenu(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          background: decisionMode === 'exploration' ? 'rgba(139,92,246,0.15)' : 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          marginBottom: 4,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = decisionMode === 'exploration' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = decisionMode === 'exploration' ? 'rgba(139,92,246,0.15)' : 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <MessageSquare style={{ width: 16, height: 16, color: decisionMode === 'exploration' ? '#A78BFA' : '#64748B' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: decisionMode === 'exploration' ? '#C4B5FD' : '#F1F5F9', marginBottom: 2 }}>Exploratory Mode</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>Multi-agent debate to surface insights</div>
                          </div>
                          {decisionMode === 'exploration' && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA' }} />
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          if (context?.decision_frame) {
                            setDecisionMode('structured');
                            setRankingResult(null);
                            setShowToolsMenu(false);
                          }
                        }}
                        disabled={!context?.decision_frame}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          background: decisionMode === 'structured' ? 'rgba(99,102,241,0.15)' : 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          cursor: context?.decision_frame ? 'pointer' : 'not-allowed',
                          opacity: context?.decision_frame ? 1 : 0.5,
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={e => {
                          if (context?.decision_frame) {
                            e.currentTarget.style.background = decisionMode === 'structured' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = decisionMode === 'structured' ? 'rgba(99,102,241,0.15)' : 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Sparkles style={{ width: 16, height: 16, color: decisionMode === 'structured' ? '#A5B4FC' : '#64748B' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: decisionMode === 'structured' ? '#C7D2FE' : '#F1F5F9', marginBottom: 2 }}>MAGDM Decision Mode</div>
                            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>Structured ranking with weighted scoring</div>
                          </div>
                          {decisionMode === 'structured' && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A5B4FC' }} />
                          )}
                        </div>
                      </button>
                      {!context?.decision_frame && (
                        <div style={{ fontSize: 10, color: '#64748B', padding: '8px 12px', lineHeight: 1.4 }}>
                          Complete the decision framing first to enable MAGDM mode
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setIsTypingAnimation(false);
                      setInput(e.target.value);
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder={sessionId ? 'Type your response...' : 'What decision do you need to make?'}
                    disabled={loading || generating}
                    rows={1}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: '13px 18px',
                      paddingLeft: '18px',
                      paddingRight: speechSupported ? '80px' : '50px',
                      fontSize: 14.5,
                      color: '#F1F5F9',
                      outline: 'none',
                      fontFamily: 'DM Sans, system-ui, sans-serif',
                      resize: 'none',
                      minHeight: '46px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      lineHeight: '1.5',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(99,102,241,0.5) rgba(255,255,255,0.05)',
                    }}
                    onFocus={e => {
                      setIsTypingAnimation(false);
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 150) + 'px';
                    }}
                  />
                  <button
                    onClick={sessionId ? handleSend : () => handleStart(input)}
                    disabled={!input.trim() || loading || generating}
                    style={{
                      position: 'absolute',
                      right: speechSupported ? '44px' : '12px',
                      bottom: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      background: !input.trim() || loading || generating ? 'transparent' : '#6366F1',
                      border: 'none',
                      borderRadius: '50%',
                      color: !input.trim() || loading || generating ? '#475569' : '#fff',
                      cursor: !input.trim() || loading || generating ? 'not-allowed' : 'pointer',
                      transition: 'all 180ms',
                      padding: 0,
                    }}
                    onMouseEnter={e => {
                      if (input.trim() && !loading && !generating) {
                        e.currentTarget.style.background = '#818CF8';
                      }
                    }}
                    onMouseLeave={e => {
                      if (input.trim() && !loading && !generating) {
                        e.currentTarget.style.background = '#6366F1';
                      }
                    }}
                    title="Send message"
                  >
                    <ArrowUp size={18} />
                  </button>
                  {speechSupported && (
                    <button
                      onClick={toggleSpeechRecognition}
                      disabled={loading || generating}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        bottom: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '50%',
                        color: isListening ? '#EF4444' : '#64748B',
                        cursor: loading || generating ? 'not-allowed' : 'pointer',
                        transition: 'all 180ms',
                        padding: 0,
                      }}
                      onMouseEnter={e => {
                        if (!loading && !generating) {
                          e.currentTarget.style.color = isListening ? '#DC2626' : '#94A3B8';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!loading && !generating) {
                          e.currentTarget.style.color = isListening ? '#EF4444' : '#64748B';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                      title={isListening ? 'Stop recording' : 'Start voice input'}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right context panel - only show when conversation has started */}
      {messages.length > 0 && (
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
      )}
      </div>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
