import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
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
import DecisionResultsScreen from './DecisionResultsScreen';

interface Props {
  token: string;
  onBack: () => void;
}

const DOMAINS = [
  'general', 'career', 'business', 'product', 'technology',
  'financial', 'health', 'operations', 'strategy', 'legal', 'personal',
];

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.035)',
  backdropFilter: 'blur(16px)',
  padding: '24px 28px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#F1F5F9',
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#475569',
  display: 'block',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
};

const btnPrimary: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(99,102,241,0.4)',
  background: 'rgba(99,102,241,0.25)',
  color: '#C7D2FE',
  padding: '9px 20px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const btnGhost: React.CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'transparent',
  color: '#64748B',
  padding: '9px 18px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

interface AltDraft { label: string; description: string; }
interface CritDraft { name: string; description: string; direction: 'benefit' | 'cost'; weight: number; }
interface ExpDraft { name: string; role: string; description: string; }

const DEFAULT_ALTS: AltDraft[] = [
  { label: '', description: '' },
  { label: '', description: '' },
  { label: '', description: '' },
];

const SCORE_ANCHORS = [
  { range: '1–2', label: 'Very weak' },
  { range: '3–4', label: 'Weak' },
  { range: '5–6', label: 'Moderate' },
  { range: '7–8', label: 'Strong' },
  { range: '9–10', label: 'Excellent' },
];

export default function DecisionWizardScreen({ token, onBack }: Props) {
  const [step, setStep] = useState<'frame' | 'alternatives' | 'criteria' | 'experts' | 'results'>('frame');
  const [session, setSession] = useState<DecisionSessionResponse | null>(null);
  const [ranking, setRanking] = useState<RankingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Frame
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [domain, setDomain] = useState('general');

  // Alternatives
  const [alts, setAlts] = useState<AltDraft[]>(DEFAULT_ALTS);
  const [suggestingAlts, setSuggestingAlts] = useState(false);

  // Criteria
  const [crits, setCrits] = useState<CritDraft[]>([]);
  const [suggestingCrits, setSuggestingCrits] = useState(false);
  const [weightMode, setWeightMode] = useState<'ai' | 'equal' | 'manual'>('ai');

  // Experts
  const [experts, setExperts] = useState<ExpDraft[]>([]);
  const [suggestingExperts, setSuggestingExperts] = useState(false);

  // -----------------------------------------------------------------------
  // Step 1: Frame
  // -----------------------------------------------------------------------
  async function handleFrameNext() {
    if (!title.trim() || problemStatement.trim().length < 10) {
      setError('Please fill in a title and a problem statement (min 10 chars).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await createDecisionSession(token, { title, problem_statement: problemStatement, domain });
      setSession(s);
      setStep('alternatives');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create decision session');
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Step 2: Alternatives
  // -----------------------------------------------------------------------
  async function handleSuggestAlts() {
    setSuggestingAlts(true);
    setError(null);
    try {
      const suggestions = await suggestAlternatives(token, problemStatement, domain, alts.map(a => a.label).filter(Boolean));
      setAlts(prev => {
        const merged = [...prev.filter(a => a.label.trim()), ...suggestions];
        return merged.slice(0, 8);
      });
    } catch (e) {
      setError('Failed to suggest alternatives');
    } finally {
      setSuggestingAlts(false);
    }
  }

  async function handleAltsNext() {
    const active = alts.filter(a => a.label.trim());
    if (active.length < 2) { setError('At least 2 alternatives required'); return; }
    if (active.length > 8) { setError('Maximum 8 alternatives allowed'); return; }
    setLoading(true);
    setError(null);
    try {
      await updateDecisionAlternatives(token, session!.id, active);
      setAlts(active);
      // Auto-suggest criteria
      setSuggestingCrits(true);
      const suggestions = await suggestCriteria(token, problemStatement, domain, active.map(a => a.label));
      const mapped: CritDraft[] = suggestions.slice(0, 10).map(s => ({
        name: s.name,
        description: s.description,
        direction: (s.direction === 'cost' ? 'cost' : 'benefit') as 'benefit' | 'cost',
        weight: typeof s.weight === 'number' ? s.weight : 5,
      }));
      setCrits(mapped.length > 0 ? mapped : [{ name: '', description: '', direction: 'benefit', weight: 5 }]);
      setSuggestingCrits(false);
      setStep('criteria');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save alternatives');
    } finally {
      setLoading(false);
      setSuggestingCrits(false);
    }
  }

  // -----------------------------------------------------------------------
  // Step 3: Criteria + weights
  // -----------------------------------------------------------------------
  function applyEqualWeights() {
    setCrits(prev => prev.map(c => ({ ...c, weight: 1 })));
    setWeightMode('equal');
  }

  async function handleSuggestCrits() {
    setSuggestingCrits(true);
    try {
      const suggestions = await suggestCriteria(token, problemStatement, domain, alts.map(a => a.label), crits.map(c => c.name).filter(Boolean));
      const mapped: CritDraft[] = suggestions.slice(0, 10).map(s => ({
        name: s.name,
        description: s.description,
        direction: (s.direction === 'cost' ? 'cost' : 'benefit') as 'benefit' | 'cost',
        weight: typeof s.weight === 'number' ? s.weight : 5,
      }));
      setCrits(mapped.length ? mapped : crits);
    } catch {
      setError('Failed to suggest criteria');
    } finally {
      setSuggestingCrits(false);
    }
  }

  async function handleCritsNext() {
    const active = crits.filter(c => c.name.trim());
    if (active.length < 2) { setError('At least 2 criteria required'); return; }
    if (active.length > 10) { setError('Maximum 10 criteria allowed'); return; }
    setLoading(true);
    setError(null);
    try {
      await updateDecisionCriteria(token, session!.id, active);
      // Auto-suggest experts
      setSuggestingExperts(true);
      const suggestions = await suggestExperts(token, problemStatement, domain, active.map(c => c.name));
      setExperts(suggestions.slice(0, 5).map(s => ({ name: s.name, role: s.role, description: s.description })));
      setSuggestingExperts(false);
      setStep('experts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save criteria');
    } finally {
      setLoading(false);
      setSuggestingExperts(false);
    }
  }

  // -----------------------------------------------------------------------
  // Step 4: Experts
  // -----------------------------------------------------------------------
  async function handleSuggestExperts() {
    setSuggestingExperts(true);
    try {
      const suggestions = await suggestExperts(token, problemStatement, domain, crits.map(c => c.name));
      setExperts(suggestions.slice(0, 5).map(s => ({ name: s.name, role: s.role, description: s.description })));
    } catch {
      setError('Failed to suggest experts');
    } finally {
      setSuggestingExperts(false);
    }
  }

  async function handleRunEvaluation() {
    const activeExperts = experts.filter(e => e.name.trim());
    if (activeExperts.length < 1) { setError('At least 1 expert required'); return; }
    setLoading(true);
    setError(null);
    try {
      await updateDecisionExperts(token, session!.id, activeExperts);
      const result = await runDecisionEvaluation(token, session!.id);
      setRanking(result);
      setStep('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (step === 'results' && ranking && session) {
    return (
      <DecisionResultsScreen
        token={token}
        session={session}
        ranking={ranking}
        alternatives={alts.filter(a => a.label.trim())}
        criteria={crits.filter(c => c.name.trim())}
        experts={experts.filter(e => e.name.trim())}
        onBack={onBack}
        onRerun={() => setStep('experts')}
      />
    );
  }

  const steps = ['frame', 'alternatives', 'criteria', 'experts'];
  const stepIdx = steps.indexOf(step);
  const stepLabels = ['Framing', 'Alternatives', 'Criteria', 'Experts'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#06080F', padding: '24px 32px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button onClick={onBack} style={{ ...btnGhost, padding: '6px 12px' }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Back
        </button>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>
            Structured Decision
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>Multi-attribute group decision engine</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {stepLabels.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: i < stepIdx ? 'rgba(99,102,241,0.3)' : i === stepIdx ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.05)',
              color: i <= stepIdx ? '#C7D2FE' : '#475569',
              border: `1px solid ${i <= stepIdx ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
            }}>{i + 1}</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: i === stepIdx ? '#A5B4FC' : '#475569' }}>{label}</span>
            {i < steps.length - 1 && <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.07)', marginLeft: 2 }} />}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', padding: '10px 16px', fontSize: 13, color: '#fca5a5', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ maxWidth: 700, width: '100%' }}>
        {/* ---------------------------------------------------------------- */}
        {step === 'frame' && (
          <div style={cardStyle}>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: '#F1F5F9', marginBottom: 20 }}>
              What are you deciding?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Decision Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Which job offer should I take?" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Problem Statement * (min 10 chars)</label>
                <textarea
                  value={problemStatement}
                  onChange={e => setProblemStatement(e.target.value)}
                  placeholder="Describe the decision in full. Include context, constraints, what you need to decide between, and what success looks like."
                  style={{ ...inputStyle, height: 110, resize: 'none' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Domain</label>
                <select value={domain} onChange={e => setDomain(e.target.value)} style={{ ...inputStyle }}>
                  {DOMAINS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={handleFrameNext} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
                  {loading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : null}
                  Alternatives <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {step === 'alternatives' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: '#F1F5F9' }}>
                What are the options? (2–8)
              </h2>
              <button onClick={handleSuggestAlts} disabled={suggestingAlts} style={{ ...btnGhost, fontSize: 12, padding: '6px 14px', opacity: suggestingAlts ? 0.5 : 1 }}>
                {suggestingAlts ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 12, height: 12 }} />}
                AI Suggest
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alts.map((alt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      value={alt.label}
                      onChange={e => setAlts(prev => prev.map((a, j) => j === i ? { ...a, label: e.target.value } : a))}
                      placeholder={`Option ${i + 1}`}
                      style={{ ...inputStyle, marginBottom: 4 }}
                    />
                    <input
                      value={alt.description}
                      onChange={e => setAlts(prev => prev.map((a, j) => j === i ? { ...a, description: e.target.value } : a))}
                      placeholder="Brief description (optional)"
                      style={{ ...inputStyle, fontSize: 11 }}
                    />
                  </div>
                  <button onClick={() => setAlts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', marginTop: 6 }}>
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ))}
              {alts.length < 8 && (
                <button onClick={() => setAlts(prev => [...prev, { label: '', description: '' }])} style={{ ...btnGhost, fontSize: 12, alignSelf: 'flex-start' }}>
                  <Plus style={{ width: 12, height: 12 }} /> Add option
                </button>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setStep('frame')} style={btnGhost}><ArrowLeft style={{ width: 14, height: 14 }} /> Back</button>
              <button onClick={handleAltsNext} disabled={loading || suggestingCrits} style={{ ...btnPrimary, opacity: (loading || suggestingCrits) ? 0.5 : 1 }}>
                {(loading || suggestingCrits) ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : null}
                Criteria <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {step === 'criteria' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: '#F1F5F9' }}>
                Evaluation Criteria (2–10)
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSuggestCrits} disabled={suggestingCrits} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px', opacity: suggestingCrits ? 0.5 : 1 }}>
                  {suggestingCrits ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 12, height: 12 }} />}
                  AI Suggest
                </button>
                <button onClick={applyEqualWeights} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>Equal</button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>
              Weight: 1–10 (relative importance). Direction: <span style={{ color: '#4ADE80' }}>benefit</span> = higher is better, <span style={{ color: '#F87171' }}>cost</span> = lower is better.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {crits.map((crit, i) => (
                <div key={i} style={{ ...cardStyle, padding: '12px 16px', gap: 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      value={crit.name}
                      onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                      placeholder="Criterion name"
                      style={{ ...inputStyle, flex: 2 }}
                    />
                    <select
                      value={crit.direction}
                      onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, direction: e.target.value as 'benefit' | 'cost' } : c))}
                      style={{ ...inputStyle, flex: 1 }}
                    >
                      <option value="benefit">Benefit ↑</option>
                      <option value="cost">Cost ↓</option>
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                      <input
                        type="range"
                        min={1} max={10} step={1}
                        value={crit.weight}
                        onChange={e => { setCrits(prev => prev.map((c, j) => j === i ? { ...c, weight: Number(e.target.value) } : c)); setWeightMode('manual'); }}
                        style={{ flex: 1, accentColor: '#6366F1' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#A5B4FC', minWidth: 16, textAlign: 'right' }}>{crit.weight}</span>
                    </div>
                    <button onClick={() => setCrits(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                  <input
                    value={crit.description}
                    onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, description: e.target.value } : c))}
                    placeholder="Description (optional)"
                    style={{ ...inputStyle, fontSize: 11 }}
                  />
                </div>
              ))}
              {crits.length < 10 && (
                <button onClick={() => setCrits(prev => [...prev, { name: '', description: '', direction: 'benefit', weight: 5 }])} style={{ ...btnGhost, fontSize: 12, alignSelf: 'flex-start' }}>
                  <Plus style={{ width: 12, height: 12 }} /> Add criterion
                </button>
              )}
            </div>

            {/* Weight mode badge */}
            <div style={{ fontSize: 11, color: '#475569', marginTop: 12 }}>
              Weight mode: <span style={{ color: '#A5B4FC', fontWeight: 600 }}>{weightMode === 'ai' ? 'AI suggested' : weightMode === 'equal' ? 'Equal' : 'Manual'}</span>
              {' '}— weights will be auto-normalized to sum = 1
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setStep('alternatives')} style={btnGhost}><ArrowLeft style={{ width: 14, height: 14 }} /> Back</button>
              <button onClick={handleCritsNext} disabled={loading || suggestingExperts} style={{ ...btnPrimary, opacity: (loading || suggestingExperts) ? 0.5 : 1 }}>
                {(loading || suggestingExperts) ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : null}
                Experts <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {step === 'experts' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: '#F1F5F9' }}>
                Expert Evaluators (1–6)
              </h2>
              <button onClick={handleSuggestExperts} disabled={suggestingExperts} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px', opacity: suggestingExperts ? 0.5 : 1 }}>
                {suggestingExperts ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 12, height: 12 }} />}
                AI Suggest
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 14, lineHeight: 1.5 }}>
              Expert weights are equal in V1. Each expert performs a single-pass structured evaluation of all alternatives.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {experts.map((exp, i) => (
                <div key={i} style={{ ...cardStyle, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      value={exp.name}
                      onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, name: e.target.value } : ex))}
                      placeholder="Expert name"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      value={exp.role}
                      onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, role: e.target.value } : ex))}
                      placeholder="Role / perspective"
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={() => setExperts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                  <input
                    value={exp.description}
                    onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, description: e.target.value } : ex))}
                    placeholder="What lens does this expert bring?"
                    style={{ ...inputStyle, fontSize: 11 }}
                  />
                </div>
              ))}
              {experts.length < 6 && (
                <button onClick={() => setExperts(prev => [...prev, { name: '', role: '', description: '' }])} style={{ ...btnGhost, fontSize: 12, alignSelf: 'flex-start' }}>
                  <Plus style={{ width: 12, height: 12 }} /> Add expert
                </button>
              )}
            </div>

            <div style={{ marginTop: 20, borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.06)', padding: '12px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#A5B4FC', marginBottom: 8 }}>Ready to evaluate</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  <span style={{ fontWeight: 700, color: '#94A3B8' }}>{alts.filter(a => a.label.trim()).length}</span> alternatives
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  <span style={{ fontWeight: 700, color: '#94A3B8' }}>{crits.filter(c => c.name.trim()).length}</span> criteria
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>
                  <span style={{ fontWeight: 700, color: '#94A3B8' }}>{experts.filter(e => e.name.trim()).length}</span> experts
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
                Each expert evaluates {alts.filter(a => a.label.trim()).length} × {crits.filter(c => c.name.trim()).length} = {alts.filter(a => a.label.trim()).length * crits.filter(c => c.name.trim()).length} score cells in one pass.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setStep('criteria')} style={btnGhost}><ArrowLeft style={{ width: 14, height: 14 }} /> Back</button>
              <button onClick={handleRunEvaluation} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
                {loading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 14, height: 14 }} />}
                {loading ? 'Evaluating…' : 'Run Evaluation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
