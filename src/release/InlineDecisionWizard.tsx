import React, { useState } from 'react';
import { ArrowRight, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
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
interface ExpDraft { name: string; role: string; description: string; }

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  padding: '16px 20px',
  marginBottom: 12,
};

const btnPrimary: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid rgba(99,102,241,0.4)',
  background: 'rgba(99,102,241,0.25)',
  color: '#C7D2FE',
  padding: '7px 16px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const btnGhost: React.CSSProperties = {
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'transparent',
  color: '#64748B',
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 5,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  color: '#F1F5F9',
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
};

export default function InlineDecisionWizard({ token, title, problemStatement, domain, onComplete, onCancel }: Props) {
  const [step, setStep] = useState<'alternatives' | 'criteria' | 'experts' | 'evaluating'>('alternatives');
  const [session, setSession] = useState<DecisionSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [alts, setAlts] = useState<AltDraft[]>([{ label: '', description: '' }, { label: '', description: '' }]);
  const [crits, setCrits] = useState<CritDraft[]>([]);
  const [experts, setExperts] = useState<ExpDraft[]>([]);

  const [suggestingAlts, setSuggestingAlts] = useState(false);
  const [suggestingCrits, setSuggestingCrits] = useState(false);
  const [suggestingExperts, setSuggestingExperts] = useState(false);

  React.useEffect(() => {
    async function init() {
      try {
        const s = await createDecisionSession(token, { title, problem_statement: problemStatement, domain });
        setSession(s);
        // Auto-suggest alternatives
        setSuggestingAlts(true);
        const suggestions = await suggestAlternatives(token, problemStatement, domain);
        if (suggestions.length > 0) {
          setAlts(suggestions.slice(0, 6).map(s => ({ label: s.label, description: s.description })));
        }
        setSuggestingAlts(false);
      } catch (e) {
        setError('Failed to initialize decision session');
      }
    }
    init();
  }, []);

  async function handleAltsNext() {
    const active = alts.filter(a => a.label.trim());
    if (active.length < 2) { setError('At least 2 alternatives required'); return; }
    setLoading(true);
    setError(null);
    try {
      await updateDecisionAlternatives(token, session!.id, active);
      setSuggestingCrits(true);
      const suggestions = await suggestCriteria(token, problemStatement, domain, active.map(a => a.label));
      setCrits(suggestions.slice(0, 8).map(s => ({
        name: s.name,
        description: s.description,
        direction: (s.direction === 'cost' ? 'cost' : 'benefit') as 'benefit' | 'cost',
        weight: typeof s.weight === 'number' ? s.weight : 5,
      })));
      setSuggestingCrits(false);
      setStep('criteria');
    } catch (e) {
      setError('Failed to save alternatives');
    } finally {
      setLoading(false);
    }
  }

  async function handleCritsNext() {
    const active = crits.filter(c => c.name.trim());
    if (active.length < 2) { setError('At least 2 criteria required'); return; }
    setLoading(true);
    setError(null);
    try {
      await updateDecisionCriteria(token, session!.id, active);
      setSuggestingExperts(true);
      const suggestions = await suggestExperts(token, problemStatement, domain, active.map(c => c.name));
      setExperts(suggestions.slice(0, 5).map(s => ({ name: s.name, role: s.role, description: s.description })));
      setSuggestingExperts(false);
      setStep('experts');
    } catch (e) {
      setError('Failed to save criteria');
    } finally {
      setLoading(false);
    }
  }

  async function handleEvaluate() {
    const activeExperts = experts.filter(e => e.name.trim());
    if (activeExperts.length < 1) { setError('At least 1 expert required'); return; }
    setLoading(true);
    setError(null);
    setStep('evaluating');
    try {
      await updateDecisionExperts(token, session!.id, activeExperts);
      const result = await runDecisionEvaluation(token, session!.id);
      onComplete(result, { alts, crits, experts });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
      setStep('experts');
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 12 }}>
          <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          Initializing decision session...
        </div>
      </div>
    );
  }

  if (step === 'evaluating') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#A5B4FC', fontSize: 12 }}>
          <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          Running evaluation... ({experts.filter(e => e.name.trim()).length} experts × {alts.filter(a => a.label.trim()).length} alternatives × {crits.filter(c => c.name.trim()).length} criteria)
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && (
        <div style={{ borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', fontSize: 11, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Alternatives */}
      {step === 'alternatives' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Options (2–8)</div>
            <button onClick={async () => {
              setSuggestingAlts(true);
              try {
                const suggestions = await suggestAlternatives(token, problemStatement, domain, alts.map(a => a.label).filter(Boolean));
                setAlts(prev => [...prev.filter(a => a.label.trim()), ...suggestions].slice(0, 8));
              } finally {
                setSuggestingAlts(false);
              }
            }} disabled={suggestingAlts} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>
              {suggestingAlts ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 11, height: 11 }} />}
              Suggest
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alts.map((alt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input
                  value={alt.label}
                  onChange={e => setAlts(prev => prev.map((a, j) => j === i ? { ...a, label: e.target.value } : a))}
                  placeholder={`Option ${i + 1}`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={() => setAlts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
            {alts.length < 8 && (
              <button onClick={() => setAlts(prev => [...prev, { label: '', description: '' }])} style={{ ...btnGhost, fontSize: 11, alignSelf: 'flex-start', padding: '4px 10px' }}>
                <Plus style={{ width: 11, height: 11 }} /> Add
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button onClick={onCancel} style={btnGhost}>Cancel</button>
            <button onClick={handleAltsNext} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
              {loading ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : null}
              Criteria <ArrowRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>
      )}

      {/* Criteria */}
      {step === 'criteria' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Criteria (2–10)</div>
            <button onClick={async () => {
              setSuggestingCrits(true);
              try {
                const suggestions = await suggestCriteria(token, problemStatement, domain, alts.map(a => a.label));
                setCrits(suggestions.slice(0, 10).map(s => ({
                  name: s.name,
                  description: s.description,
                  direction: (s.direction === 'cost' ? 'cost' : 'benefit') as 'benefit' | 'cost',
                  weight: typeof s.weight === 'number' ? s.weight : 5,
                })));
              } finally {
                setSuggestingCrits(false);
              }
            }} disabled={suggestingCrits} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>
              {suggestingCrits ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 11, height: 11 }} />}
              Suggest
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {crits.map((crit, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  value={crit.name}
                  onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, name: e.target.value } : c))}
                  placeholder="Criterion"
                  style={{ ...inputStyle, flex: 2 }}
                />
                <select
                  value={crit.direction}
                  onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, direction: e.target.value as 'benefit' | 'cost' } : c))}
                  style={{ ...inputStyle, flex: 1, fontSize: 11 }}
                >
                  <option value="benefit">↑ Benefit</option>
                  <option value="cost">↓ Cost</option>
                </select>
                <input
                  type="range"
                  min={1} max={10} step={1}
                  value={crit.weight}
                  onChange={e => setCrits(prev => prev.map((c, j) => j === i ? { ...c, weight: Number(e.target.value) } : c))}
                  style={{ width: 60, accentColor: '#6366F1' }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#A5B4FC', minWidth: 14 }}>{crit.weight}</span>
                <button onClick={() => setCrits(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
            {crits.length < 10 && (
              <button onClick={() => setCrits(prev => [...prev, { name: '', description: '', direction: 'benefit', weight: 5 }])} style={{ ...btnGhost, fontSize: 11, alignSelf: 'flex-start', padding: '4px 10px' }}>
                <Plus style={{ width: 11, height: 11 }} /> Add
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button onClick={() => setStep('alternatives')} style={btnGhost}>Back</button>
            <button onClick={handleCritsNext} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
              {loading ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : null}
              Experts <ArrowRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
        </div>
      )}

      {/* Experts */}
      {step === 'experts' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>Experts (1–6)</div>
            <button onClick={async () => {
              setSuggestingExperts(true);
              try {
                const suggestions = await suggestExperts(token, problemStatement, domain, crits.map(c => c.name));
                setExperts(suggestions.slice(0, 5).map(s => ({ name: s.name, role: s.role, description: s.description })));
              } finally {
                setSuggestingExperts(false);
              }
            }} disabled={suggestingExperts} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>
              {suggestingExperts ? <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 11, height: 11 }} />}
              Suggest
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {experts.map((exp, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}>
                <input
                  value={exp.name}
                  onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, name: e.target.value } : ex))}
                  placeholder="Expert name"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  value={exp.role}
                  onChange={e => setExperts(prev => prev.map((ex, j) => j === i ? { ...ex, role: e.target.value } : ex))}
                  placeholder="Role"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={() => setExperts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
            {experts.length < 6 && (
              <button onClick={() => setExperts(prev => [...prev, { name: '', role: '', description: '' }])} style={{ ...btnGhost, fontSize: 11, alignSelf: 'flex-start', padding: '4px 10px' }}>
                <Plus style={{ width: 11, height: 11 }} /> Add
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <button onClick={() => setStep('criteria')} style={btnGhost}>Back</button>
            <button onClick={handleEvaluate} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>
              {loading ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: 12, height: 12 }} />}
              Evaluate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
