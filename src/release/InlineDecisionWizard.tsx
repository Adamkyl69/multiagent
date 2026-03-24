import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Plus, Sparkles, Trash2, Check, Users, Scale, Layers, SlidersHorizontal, Brain } from 'lucide-react';
import {
  createDecisionSession,
  runDecisionEvaluation,
  suggestAlternatives,
  suggestCriteria,
  suggestExperts,
  updateDecisionAlternatives,
  updateDecisionCriteria,
  updateDecisionExperts,
} from './api';
import type { DecisionSessionResponse, RankingResult } from './types';

export interface WizardSessionData {
  alts: AltDraft[];
  crits: CritDraft[];
  experts: ExpDraft[];
}

interface Props {
  token: string;
  title: string;
  problemStatement: string;
  domain: string;
  onComplete: (ranking: RankingResult, sessionData: WizardSessionData) => void;
  onCancel: () => void;
}

interface AltDraft { label: string; description: string; }
interface CritDraft { name: string; description: string; direction: 'benefit' | 'cost'; weight: number; }
interface ExpDraft { name: string; role: string; description: string; weight: number; }

type Step = 'alternatives' | 'criteria' | 'experts' | 'weights' | 'evaluating';

const STEP_CONFIG = [
  { id: 'alternatives', label: 'Options', icon: Layers },
  { id: 'criteria', label: 'Criteria', icon: Scale },
  { id: 'experts', label: 'Experts', icon: Users },
  { id: 'weights', label: 'Weights', icon: SlidersHorizontal },
  { id: 'evaluating', label: 'Evaluate', icon: Brain },
] as const;

const AGENT_COLORS = ['#6366F1','#22C55E','#F59E0B','#EC4899','#14B8A6','#8B5CF6'];

function agentInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const card: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  padding: '18px 20px',
};

const btnPrimary: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid rgba(99,102,241,0.4)',
  background: 'rgba(99,102,241,0.25)',
  color: '#C7D2FE',
  padding: '8px 18px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'inherit',
};

const btnGhost: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent',
  color: '#64748B',
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontFamily: 'inherit',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  color: '#F1F5F9',
  padding: '7px 10px',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

interface DebateMessage {
  expertName: string;
  color: string;
  text: string;
  done: boolean;
}

export default function InlineDecisionWizard({ token, title, problemStatement, domain, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>('alternatives');
  const [session, setSession] = useState<DecisionSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alts, setAlts] = useState<AltDraft[]>([]);
  const [crits, setCrits] = useState<CritDraft[]>([]);
  const [experts, setExperts] = useState<ExpDraft[]>([]);

  const [suggestingAlts, setSuggestingAlts] = useState(false);
  const [suggestingCrits, setSuggestingCrits] = useState(false);
  const [suggestingExperts, setSuggestingExperts] = useState(false);

  // Debate simulation state
  const [debateMessages, setDebateMessages] = useState<DebateMessage[]>([]);
  const evalResultRef = useRef<RankingResult | null>(null);
  const evalDoneRef = useRef(false);

  useEffect(() => {
    async function init() {
      try {
        const s = await createDecisionSession(token, { title, problem_statement: problemStatement, domain });
        setSession(s);
        setSuggestingAlts(true);
        const suggestions = await suggestAlternatives(token, problemStatement, domain);
        setAlts(suggestions.slice(0, 6).map(s => ({ label: s.label, description: s.description })));
        setSuggestingAlts(false);
      } catch {
        setError('Failed to initialize decision session. Check your connection and try again.');
      }
    }
    init();
  }, []);

  // ── Step handlers ──────────────────────────────────────────────────

  async function handleAltsNext() {
    const active = alts.filter(a => a.label.trim());
    if (active.length < 2) { setError('Add at least 2 alternatives.'); return; }
    setLoading(true); setError(null);
    try {
      await updateDecisionAlternatives(token, session!.id, active);
      setSuggestingCrits(true);
      const suggestions = await suggestCriteria(token, problemStatement, domain, active.map(a => a.label));
      setCrits(suggestions.slice(0, 8).map(s => ({
        name: s.name, description: s.description,
        direction: (s.direction === 'cost' ? 'cost' : 'benefit') as 'benefit' | 'cost',
        weight: typeof s.weight === 'number' ? Math.round(s.weight) : 5,
      })));
      setSuggestingCrits(false);
      setStep('criteria');
    } catch { setError('Failed to save alternatives.'); }
    finally { setLoading(false); }
  }

  async function handleCritsNext() {
    const active = crits.filter(c => c.name.trim());
    if (active.length < 2) { setError('Add at least 2 criteria.'); return; }
    setLoading(true); setError(null);
    try {
      setSuggestingExperts(true);
      const suggestions = await suggestExperts(token, problemStatement, domain, active.map(c => c.name));
      setExperts(suggestions.slice(0, 5).map(s => ({ name: s.name, role: s.role, description: s.description, weight: 5 })));
      setSuggestingExperts(false);
      setStep('experts');
    } catch { setError('Failed to suggest experts.'); }
    finally { setLoading(false); }
  }

  async function handleExpertsNext() {
    const active = experts.filter(e => e.name.trim() && e.role.trim());
    if (active.length < 1) { setError('Add at least 1 expert.'); return; }
    setStep('weights');
  }

  async function handleStartEvaluation() {
    const activeAlts = alts.filter(a => a.label.trim());
    const activeCrits = crits.filter(c => c.name.trim());
    const activeExperts = experts.filter(e => e.name.trim() && e.role.trim());
    setLoading(true); setError(null);
    setStep('evaluating');
    setDebateMessages([]);
    evalDoneRef.current = false;
    evalResultRef.current = null;

    // Fire API call in background
    const evalPromise = (async () => {
      await updateDecisionCriteria(token, session!.id, activeCrits);
      await updateDecisionExperts(token, session!.id, activeExperts);
      const result = await runDecisionEvaluation(token, session!.id);
      evalResultRef.current = result;
      evalDoneRef.current = true;
    })();

    // Animate debate messages in parallel
    const phases = [
      'Reading alternatives and criteria...',
      'Applying decision weights...',
      'Scoring each alternative...',
      'Recording evaluation...',
    ];

    for (let ei = 0; ei < activeExperts.length; ei++) {
      const exp = activeExperts[ei];
      const color = AGENT_COLORS[ei % AGENT_COLORS.length];
      for (let pi = 0; pi < phases.length; pi++) {
        await new Promise(r => setTimeout(r, 420 + Math.random() * 300));
        setDebateMessages(prev => [
          ...prev,
          { expertName: exp.name, color, text: phases[pi], done: pi === phases.length - 1 },
        ]);
      }
    }

    // Wait for API + show aggregation
    await new Promise(r => setTimeout(r, 400));
    setDebateMessages(prev => [...prev, { expertName: 'System', color: '#6366F1', text: 'Aggregating weighted scores...', done: false }]);
    await evalPromise.catch(() => {});
    setDebateMessages(prev => [...prev, { expertName: 'System', color: '#22C55E', text: 'Generating decision insights...', done: true }]);
    await new Promise(r => setTimeout(r, 600));

    if (evalResultRef.current) {
      onComplete(evalResultRef.current, { alts: activeAlts, crits: activeCrits, experts: activeExperts });
    } else {
      setError('Evaluation failed. Please try again.');
      setStep('weights');
    }
    setLoading(false);
  }

  // ── Render helpers ──────────────────────────────────────────────────

  const currentStepIdx = STEP_CONFIG.findIndex(s => s.id === step);

  // ── Loading / init state ──
  if (!session) {
    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748B', fontSize: 13 }}>
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
          Initializing decision session...
        </div>
      </div>
    );
  }

  // ── Debate simulation screen ──
  if (step === 'evaluating') {
    return (
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Brain style={{ width: 16, height: 16, color: '#818CF8' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Expert Panel Evaluation</span>
          <Loader2 style={{ width: 13, height: 13, color: '#6366F1', animation: 'spin 1s linear infinite', marginLeft: 4 }} />
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 14 }}>
          {experts.filter(e => e.name.trim()).length} experts · {alts.filter(a => a.label.trim()).length} alternatives · {crits.filter(c => c.name.trim()).length} criteria
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {debateMessages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: 1, animation: 'fadeIn 0.3s ease' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: `${msg.color}22`, border: `1px solid ${msg.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: msg.color,
              }}>
                {msg.expertName === 'System' ? '⚙' : agentInitials(msg.expertName)}
              </div>
              <div style={{ paddingTop: 2 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: msg.color, marginBottom: 2 }}>{msg.expertName}</div>
                <div style={{ fontSize: 12, color: msg.done ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {msg.done
                    ? <><Check style={{ width: 11, height: 11, color: '#22C55E' }} /> {msg.text}</>
                    : <><Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> {msg.text}</>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
        {error && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#fca5a5', background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '8px 12px' }}>{error}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Step progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEP_CONFIG.filter(s => s.id !== 'evaluating').map((s, i, arr) => {
          const sIdx = STEP_CONFIG.findIndex(x => x.id === s.id);
          const done = currentStepIdx > sIdx;
          const active = currentStepIdx === sIdx;
          const Icon = s.icon;
          return (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: done ? 'rgba(34,197,94,0.15)' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${done ? '#22C55E' : active ? '#6366F1' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 200ms',
                }}>
                  {done
                    ? <Check style={{ width: 13, height: 13, color: '#22C55E' }} />
                    : <Icon style={{ width: 13, height: 13, color: active ? '#A5B4FC' : '#475569' }} />
                  }
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: active ? '#A5B4FC' : done ? '#22C55E' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ flex: 1, height: 1.5, background: done ? '#22C55E44' : 'rgba(255,255,255,0.06)', margin: '0 6px', marginBottom: 16, transition: 'background 300ms' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div style={{ borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', padding: '8px 12px', fontSize: 12, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* ── STEP 1: Alternatives ── */}
      {step === 'alternatives' && (
        <div style={card}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>What are the options?</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Define the alternatives you're choosing between. AI has suggested a starting point.</div>
          </div>
          {suggestingAlts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366F1', fontSize: 12, marginBottom: 10 }}>
              <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> Suggesting options...
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {alts.map((alt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#A5B4FC',
                }}>{i + 1}</div>
                <input value={alt.label} onChange={e => setAlts(prev => prev.map((a, j) => j === i ? { ...a, label: e.target.value } : a))}
                  placeholder={`Option ${i + 1} — e.g. "Build in-house"`} style={{ ...inputStyle, flex: 1 }} />
                <input value={alt.description} onChange={e => setAlts(prev => prev.map((a, j) => j === i ? { ...a, description: e.target.value } : a))}
                  placeholder="Brief description (optional)" style={{ ...inputStyle, flex: 1.5, fontSize: 11 }} />
                <button onClick={() => setAlts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
                  <Trash2 style={{ width: 13, height: 13 }} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {alts.length < 8 && (
              <button onClick={() => setAlts(prev => [...prev, { label: '', description: '' }])} style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>
                <Plus style={{ width: 11, height: 11 }} /> Add option
              </button>
            )}
            <button onClick={async () => {
              setSuggestingAlts(true);
              try {
                const s = await suggestAlternatives(token, problemStatement, domain, alts.map(a => a.label).filter(Boolean));
                setAlts(prev => {
                  const existing = prev.filter(a => a.label.trim());
                  const merged = [...existing, ...s.map(x => ({ label: x.label, description: x.description }))].slice(0, 8);
                  return merged;
                });
              } finally { setSuggestingAlts(false); }
            }} disabled={suggestingAlts} style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>
              {suggestingAlts ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 11, height: 11 }} />}
              More suggestions
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={onCancel} style={btnGhost}>Cancel</button>
            <button onClick={handleAltsNext} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : null}
              Criteria <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Criteria ── */}
      {step === 'criteria' && (
        <div style={card}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>What criteria matter?</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Define what attributes to measure each option against. Direction: ↑ benefit = higher is better, ↓ cost = lower is better.</div>
          </div>
          {suggestingCrits && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366F1', fontSize: 12, marginBottom: 10 }}>
              <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> Suggesting criteria...
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {crits.map((crit, i) => (
              <div key={i} style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <input value={crit.name} onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                    placeholder="Criterion name" style={{ ...inputStyle, flex: 2 }} />
                  <select value={crit.direction} onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, direction: e.target.value as 'benefit' | 'cost' } : c))}
                    style={{ ...inputStyle, flex: 0, width: 110, fontSize: 11, cursor: 'pointer' }}>
                    <option value="benefit">↑ Benefit</option>
                    <option value="cost">↓ Cost</option>
                  </select>
                  <button onClick={() => setCrits(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, flexShrink: 0 }}>
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                <input value={crit.description} onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, description: e.target.value } : c))}
                  placeholder="What does this criterion measure? (optional)" style={{ ...inputStyle, fontSize: 11 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {crits.length < 10 && (
              <button onClick={() => setCrits(prev => [...prev, { name: '', description: '', direction: 'benefit', weight: 5 }])} style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>
                <Plus style={{ width: 11, height: 11 }} /> Add criterion
              </button>
            )}
            <button onClick={async () => {
              setSuggestingCrits(true);
              try {
                const s = await suggestCriteria(token, problemStatement, domain, alts.map(a => a.label));
                setCrits(s.slice(0, 10).map(x => ({ name: x.name, description: x.description, direction: (x.direction === 'cost' ? 'cost' : 'benefit') as 'benefit' | 'cost', weight: typeof x.weight === 'number' ? Math.round(x.weight) : 5 })));
              } finally { setSuggestingCrits(false); }
            }} disabled={suggestingCrits} style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>
              {suggestingCrits ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 11, height: 11 }} />}
              Re-suggest
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep('alternatives')} style={btnGhost}><ArrowLeft style={{ width: 13, height: 13 }} /> Back</button>
            <button onClick={handleCritsNext} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : null}
              Experts <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Experts ── */}
      {step === 'experts' && (
        <div style={card}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>Who are the decision makers?</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>AI agents assigned as expert evaluators. Each brings a distinct perspective to score the alternatives.</div>
          </div>
          {suggestingExperts && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366F1', fontSize: 12, marginBottom: 10 }}>
              <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> Assigning expert agents...
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {experts.map((exp, i) => {
              const color = AGENT_COLORS[i % AGENT_COLORS.length];
              return (
                <div key={i} style={{ borderRadius: 10, border: `1px solid ${color}33`, background: `${color}08`, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `${color}22`, border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color }}>
                    {agentInitials(exp.name)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={exp.name} onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, name: e.target.value } : ex))}
                        placeholder="Agent name" style={{ ...inputStyle, flex: 1, fontSize: 12 }} />
                      <input value={exp.role} onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, role: e.target.value } : ex))}
                        placeholder="Role / perspective" style={{ ...inputStyle, flex: 1.5, fontSize: 12 }} />
                    </div>
                    <input value={exp.description} onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, description: e.target.value } : ex))}
                      placeholder="What angle does this expert bring?" style={{ ...inputStyle, fontSize: 11 }} />
                  </div>
                  <button onClick={() => setExperts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, flexShrink: 0, marginTop: 2 }}>
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {experts.length < 6 && (
              <button onClick={() => setExperts(prev => [...prev, { name: '', role: '', description: '', weight: 5 }])} style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>
                <Plus style={{ width: 11, height: 11 }} /> Add expert
              </button>
            )}
            <button onClick={async () => {
              setSuggestingExperts(true);
              try {
                const s = await suggestExperts(token, problemStatement, domain, crits.map(c => c.name));
                setExperts(s.slice(0, 5).map(x => ({ name: x.name, role: x.role, description: x.description, weight: 5 })));
              } finally { setSuggestingExperts(false); }
            }} disabled={suggestingExperts} style={{ ...btnGhost, padding: '5px 10px', fontSize: 11 }}>
              {suggestingExperts ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 11, height: 11 }} />}
              Re-assign
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep('criteria')} style={btnGhost}><ArrowLeft style={{ width: 13, height: 13 }} /> Back</button>
            <button onClick={handleExpertsNext} style={btnPrimary}>
              Set Weights <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Weights ── */}
      {step === 'weights' && (
        <div style={card}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', marginBottom: 4 }}>Set the weights</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Not all criteria are equal. Adjust how much each criterion and expert matters in the final score.</div>
          </div>

          {/* Criteria weights */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Scale style={{ width: 12, height: 12 }} /> Criteria weights
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {crits.filter(c => c.name.trim()).map((crit, i) => {
                const total = crits.filter(c => c.name.trim()).reduce((s, c) => s + c.weight, 0);
                const pct = total > 0 ? Math.round((crit.weight / total) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{crit.name}</span>
                        <span style={{ fontSize: 9, color: crit.direction === 'cost' ? '#F97316' : '#818CF8', background: crit.direction === 'cost' ? 'rgba(249,115,22,0.12)' : 'rgba(99,102,241,0.12)', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>
                          {crit.direction === 'cost' ? '↓ cost' : '↑ benefit'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>weight {crit.weight}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <input type="range" min={1} max={10} step={1} value={crit.weight}
                      onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, weight: Number(e.target.value) } : c))}
                      style={{ width: '100%', accentColor: '#6366F1', cursor: 'pointer' }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expert trust / influence */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users style={{ width: 12, height: 12 }} /> Expert influence
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {experts.filter(e => e.name.trim()).map((exp, i) => {
                const color = AGENT_COLORS[i % AGENT_COLORS.length];
                const total = experts.filter(e => e.name.trim()).reduce((s, e) => s + e.weight, 0);
                const pct = total > 0 ? Math.round((exp.weight / total) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${color}22`, border: `1px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color, flexShrink: 0 }}>
                          {agentInitials(exp.name)}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{exp.name}</span>
                        <span style={{ fontSize: 10, color: '#475569' }}>{exp.role}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                    </div>
                    <input type="range" min={1} max={10} step={1} value={exp.weight}
                      onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, weight: Number(e.target.value) } : ex))}
                      style={{ width: '100%', accentColor: color, cursor: 'pointer' }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep('experts')} style={btnGhost}><ArrowLeft style={{ width: 13, height: 13 }} /> Back</button>
            <button onClick={handleStartEvaluation} style={{ ...btnPrimary, background: 'rgba(99,102,241,0.35)', border: '1px solid rgba(99,102,241,0.5)' }}>
              <Brain style={{ width: 13, height: 13 }} /> Start Evaluation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
