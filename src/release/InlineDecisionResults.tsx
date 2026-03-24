import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
  Trophy, BarChart2, Scale, Users, Zap, Eye, HelpCircle, TrendingUp,
} from 'lucide-react';
import type { RankingResult } from './types';
import type { WizardSessionData } from './InlineDecisionWizard';

interface Props {
  ranking: RankingResult;
  wizardData: WizardSessionData | null;
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#CD853F', '#6366F1', '#22C55E', '#EC4899', '#14B8A6', '#8B5CF6'];
const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  padding: '16px 20px',
  ...extra,
});

function strengthOf(ranking: RankingResult): { score: number; label: string; color: string; desc: string } {
  const alts = ranking.ranked_alternatives;
  if (alts.length < 2) return { score: 30, label: 'Insufficient', color: '#64748B', desc: 'Need at least 2 alternatives to assess strength.' };
  const spread = (alts[0].group_score - alts[1].group_score) * 100;
  const total = ranking.criterion_disagreements.length || 1;
  const contested = ranking.criterion_disagreements.filter(d => d.contested).length;
  let score = 50 + spread * 2.5 - (contested / total) * 30;
  if (ranking.is_provisional) score -= 20;
  score = Math.max(5, Math.min(100, score));
  if (score >= 72) return { score, label: 'Strong', color: '#22C55E', desc: `Clear ${spread.toFixed(1)}pt lead over #2 with low expert disagreement.` };
  if (score >= 50) return { score, label: 'Moderate', color: '#F59E0B', desc: `${spread.toFixed(1)}pt lead over #2. Some criteria are contested.` };
  if (score >= 28) return { score, label: 'Fragile', color: '#F97316', desc: `Only ${spread.toFixed(1)}pt lead. Experts disagree on key criteria.` };
  return { score, label: 'Contested', color: '#EF4444', desc: `Razor-thin ${spread.toFixed(1)}pt margin. Result is highly sensitive to expert weights.` };
}

export default function InlineDecisionResults({ ranking, wizardData }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'disagreement' | 'sensitivity'>('overview');
  const [expandedAlt, setExpandedAlt] = useState<string | null>(null);

  if (!ranking.is_complete) {
    return (
      <div style={card()}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle style={{ width: 16, height: 16, color: '#FCD34D', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FCD34D', marginBottom: 6 }}>Cannot rank — evaluation incomplete</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#94A3B8' }}>
              {ranking.completion_errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const top = ranking.ranked_alternatives[0];
  const second = ranking.ranked_alternatives[1];
  const margin = second ? ((top.group_score - second.group_score) * 100).toFixed(1) : null;
  const strength = strengthOf(ranking);

  // Build ordered criteria from sensitivity (sorted by impact_rank asc = most impactful first)
  const orderedCriteria = [...ranking.sensitivity].sort((a, b) => a.impact_rank - b.impact_rank);

  // For matrix: per-column max for heat mapping
  const colMax: Record<string, number> = {};
  const colMin: Record<string, number> = {};
  orderedCriteria.forEach(c => {
    const vals = ranking.ranked_alternatives.map(a => a.criterion_contributions[c.criterion_id] ?? 0);
    colMax[c.criterion_id] = Math.max(...vals);
    colMin[c.criterion_id] = Math.min(...vals);
  });

  // Expert name lookup by index (experts submitted in order → backend created in order)
  const expertIds = top ? Object.keys(top.expert_scores) : [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'matrix', label: 'Eval Matrix', icon: Eye },
    { id: 'disagreement', label: 'Disagreement', icon: Users },
    { id: 'sensitivity', label: 'What Changes It', icon: HelpCircle },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'DM Sans, system-ui, sans-serif' }}>

      {/* ── Dashboard Header ── */}
      <div style={card({ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)', border: '1px solid rgba(99,102,241,0.25)', padding: '14px 20px' })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale style={{ width: 16, height: 16, color: '#818CF8' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#818CF8' }}>MAGDM Decision Dashboard</span>
          </div>
          {ranking.is_provisional && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#FCD34D', background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 20, padding: '2px 10px' }}>PROVISIONAL</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Alternatives', value: ranking.ranked_alternatives.length },
            { label: 'Criteria', value: orderedCriteria.length },
            { label: 'Experts', value: expertIds.length },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: strength.color }}>{strength.label}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Decision Strength</div>
          </div>
        </div>
      </div>

      {/* ── Winner Banner ── */}
      <div style={card({ border: `1px solid ${RANK_COLORS[0]}44`, background: `linear-gradient(135deg, ${RANK_COLORS[0]}12 0%, rgba(255,255,255,0.02) 100%)` })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Trophy style={{ width: 18, height: 18, color: RANK_COLORS[0] }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: RANK_COLORS[0] }}>
            {ranking.is_provisional ? 'Provisional Recommendation' : '#1 Recommendation'}
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 12, letterSpacing: '-0.02em' }}>{top.alternative_label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>Group Score</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80' }}>{(top.group_score * 100).toFixed(1)}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${top.group_score * 100}%`, background: `linear-gradient(90deg, ${RANK_COLORS[0]}, #FDE68A)`, borderRadius: 4, transition: 'width 0.8s ease' }} />
            </div>
          </div>
        </div>
        {margin && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              <span style={{ fontWeight: 700, color: '#4ADE80' }}>+{margin}pt</span> lead over {second?.alternative_label}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              Strength: <span style={{ fontWeight: 700, color: strength.color }}>{strength.label}</span>
            </div>
          </div>
        )}
        {ranking.is_provisional && ranking.provisional_reasons.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle style={{ width: 13, height: 13, color: '#FCD34D', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{ranking.provisional_reasons.join(' • ')}</div>
          </div>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'transparent', border: 'none',
                borderBottom: active ? '2px solid #6366F1' : '2px solid transparent',
                color: active ? '#A5B4FC' : '#64748B',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 150ms',
                fontFamily: 'DM Sans, system-ui, sans-serif',
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══ TAB: OVERVIEW ══ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Ranked Alternatives */}
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <BarChart2 style={{ width: 14, height: 14, color: '#6366F1' }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Ranked Alternatives</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ranking.ranked_alternatives.map((alt) => {
                const color = RANK_COLORS[(alt.rank - 1) % RANK_COLORS.length];
                const pct = (alt.group_score * 100).toFixed(1);
                const isExpanded = expandedAlt === alt.alternative_id;
                const altDisagreement = ranking.alternative_disagreements.find(d => d.alternative_id === alt.alternative_id);
                return (
                  <div key={alt.alternative_id} style={{ borderRadius: 8, border: `1px solid ${alt.rank === 1 ? color + '44' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedAlt(isExpanded ? null : alt.alternative_id)}
                      style={{ width: '100%', background: alt.rank === 1 ? `${color}0A` : 'transparent', border: 'none', cursor: 'pointer', padding: '10px 14px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: `${color}22`, border: `1px solid ${color}66`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color,
                        }}>{alt.rank}</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>{alt.alternative_label}</div>
                          <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${alt.group_score * 100}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 52, flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: alt.rank === 1 ? '#4ADE80' : '#94A3B8' }}>{pct}%</div>
                          {altDisagreement && altDisagreement.contested_criteria.length > 0 && (
                            <div style={{ fontSize: 9, color: '#FCD34D', fontWeight: 600 }}>⚠ contested</div>
                          )}
                        </div>
                        {isExpanded ? <ChevronDown style={{ width: 14, height: 14, color: '#475569', flexShrink: 0 }} /> : <ChevronRight style={{ width: 14, height: 14, color: '#475569', flexShrink: 0 }} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Score Breakdown by Criterion</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {orderedCriteria.map(c => {
                            const contrib = alt.criterion_contributions[c.criterion_id] ?? 0;
                            const maxContrib = colMax[c.criterion_id] || 1;
                            const pctWidth = (contrib / maxContrib) * 100;
                            const wizCrit = wizardData?.crits.find(wc => wc.name === c.criterion_name);
                            return (
                              <div key={c.criterion_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontSize: 11, color: '#94A3B8', width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {c.criterion_name}
                                </div>
                                <div style={{ fontSize: 9, color: wizCrit?.direction === 'cost' ? '#F97316' : '#6366F1', background: wizCrit?.direction === 'cost' ? 'rgba(249,115,22,0.12)' : 'rgba(99,102,241,0.12)', borderRadius: 3, padding: '1px 5px', flexShrink: 0, fontWeight: 600 }}>
                                  {wizCrit?.direction === 'cost' ? '↓ cost' : '↑ benefit'}
                                </div>
                                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pctWidth}%`, background: color, borderRadius: 3 }} />
                                </div>
                                <div style={{ fontSize: 10, color: '#64748B', minWidth: 32, textAlign: 'right', flexShrink: 0 }}>
                                  {(contrib * 100).toFixed(1)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {expertIds.length > 0 && (
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expert Scores</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {expertIds.map((expId, idx) => {
                                const expName = wizardData?.experts[idx]?.name ?? `Expert ${idx + 1}`;
                                const score = alt.expert_scores[expId] ?? 0;
                                return (
                                  <div key={expId} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '4px 8px', textAlign: 'center', minWidth: 80 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: color }}>{(score * 100).toFixed(1)}%</div>
                                    <div style={{ fontSize: 9, color: '#64748B', marginTop: 1 }}>{expName}</div>
                                    {wizardData?.experts[idx]?.role && (
                                      <div style={{ fontSize: 8, color: '#475569' }}>{wizardData.experts[idx].role}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Criteria Weights */}
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Scale style={{ width: 14, height: 14, color: '#6366F1' }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Criteria Weights</span>
              <span style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>sorted by impact</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orderedCriteria.map((c, idx) => {
                const wizCrit = wizardData?.crits.find(wc => wc.name === c.criterion_name);
                const isCost = wizCrit?.direction === 'cost';
                const isContested = ranking.criterion_disagreements.find(d => d.criterion_id === c.criterion_id)?.contested;
                return (
                  <div key={c.criterion_id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', minWidth: 16 }}>#{idx + 1}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{c.criterion_name}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3, color: isCost ? '#F97316' : '#818CF8', background: isCost ? 'rgba(249,115,22,0.12)' : 'rgba(99,102,241,0.12)' }}>
                          {isCost ? '↓ cost' : '↑ benefit'}
                        </span>
                        {isContested && <span style={{ fontSize: 9, fontWeight: 600, color: '#FCD34D', background: 'rgba(252,211,77,0.1)', borderRadius: 3, padding: '1px 5px' }}>⚠ contested</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC' }}>{(c.weight_normalized * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${c.weight_normalized * 100}%`, background: isCost ? 'linear-gradient(90deg, #F97316, #FDBA74)' : 'linear-gradient(90deg, #6366F1, #A5B4FC)', borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Decision Strength */}
          <div style={card({ border: `1px solid ${strength.color}33` })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <Zap style={{ width: 14, height: 14, color: strength.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Decision Strength</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <svg viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)', width: 64, height: 64 }}>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke={strength.color} strokeWidth="6"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - strength.score / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: strength.color }}>{Math.round(strength.score)}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: strength.color, marginBottom: 4 }}>{strength.label}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5, maxWidth: 300 }}>{strength.desc}</div>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          {ranking.explanation && (
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <TrendingUp style={{ width: 14, height: 14, color: '#6366F1' }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>AI Analysis</span>
              </div>
              <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>{ranking.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: EVAL MATRIX ══ */}
      {activeTab === 'matrix' && (
        <div style={card({ padding: '16px' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <Eye style={{ width: 14, height: 14, color: '#6366F1' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Evaluation Matrix — weighted contributions</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: '#475569', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: 120 }}>Alternative</th>
                  {orderedCriteria.map(c => (
                    <th key={c.criterion_id} style={{ textAlign: 'center', padding: '6px 8px', color: '#475569', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: 80, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 100 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{c.criterion_name}</div>
                      <div style={{ fontSize: 9, color: '#374151', fontWeight: 500 }}>{(c.weight_normalized * 100).toFixed(0)}%</div>
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#475569', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ranking.ranked_alternatives.map(alt => {
                  const altColor = RANK_COLORS[(alt.rank - 1) % RANK_COLORS.length];
                  return (
                    <tr key={alt.alternative_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#F1F5F9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: altColor }}>#{alt.rank}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{alt.alternative_label}</span>
                        </div>
                      </td>
                      {orderedCriteria.map(c => {
                        const val = alt.criterion_contributions[c.criterion_id] ?? 0;
                        const max = colMax[c.criterion_id] || 1;
                        const min = colMin[c.criterion_id] || 0;
                        const range = max - min || 1;
                        const norm = (val - min) / range;
                        const bg = norm > 0.66
                          ? `rgba(34,197,94,${0.1 + norm * 0.25})`
                          : norm > 0.33
                          ? `rgba(251,191,36,${0.08 + norm * 0.2})`
                          : `rgba(239,68,68,${0.08 + (1 - norm) * 0.15})`;
                        const textColor = norm > 0.66 ? '#4ADE80' : norm > 0.33 ? '#FDE68A' : '#FCA5A5';
                        return (
                          <td key={c.criterion_id} style={{ textAlign: 'center', padding: '8px', background: bg }}>
                            <span style={{ fontWeight: 700, color: textColor }}>{(val * 100).toFixed(1)}</span>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 800, color: altColor }}>
                        {(alt.group_score * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[{ color: 'rgba(34,197,94,0.3)', label: 'High contribution' }, { color: 'rgba(251,191,36,0.2)', label: 'Medium' }, { color: 'rgba(239,68,68,0.2)', label: 'Low contribution' }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 10, color: '#64748B' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ TAB: DISAGREEMENT ══ */}
      {activeTab === 'disagreement' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Users style={{ width: 14, height: 14, color: '#FCD34D' }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Expert Disagreement by Criterion</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranking.criterion_disagreements.length === 0 && (
                <div style={{ fontSize: 12, color: '#64748B', padding: '8px 0' }}>No disagreement data available.</div>
              )}
              {ranking.criterion_disagreements.map(d => {
                const maxStddev = Math.max(...ranking.criterion_disagreements.map(x => x.stddev), 0.01);
                const pct = (d.stddev / maxStddev) * 100;
                return (
                  <div key={d.criterion_id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{d.criterion_name}</span>
                        {d.contested && <span style={{ fontSize: 9, fontWeight: 700, color: '#FCD34D', background: 'rgba(252,211,77,0.12)', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 3, padding: '1px 6px' }}>HIGH VARIANCE</span>}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748B' }}>σ = {d.stddev.toFixed(3)}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: d.contested ? 'linear-gradient(90deg, #F59E0B, #FCD34D)' : 'rgba(99,102,241,0.5)', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Users style={{ width: 14, height: 14, color: '#F97316' }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Disagreement by Alternative</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranking.alternative_disagreements.length === 0 && (
                <div style={{ fontSize: 12, color: '#64748B' }}>No alternative disagreement data available.</div>
              )}
              {ranking.alternative_disagreements.map(d => {
                const maxDisag = Math.max(...ranking.alternative_disagreements.map(x => x.mean_disagreement), 0.01);
                const pct = (d.mean_disagreement / maxDisag) * 100;
                const altRank = ranking.ranked_alternatives.find(a => a.alternative_id === d.alternative_id)?.rank;
                const altColor = altRank ? RANK_COLORS[(altRank - 1) % RANK_COLORS.length] : '#64748B';
                return (
                  <div key={d.alternative_id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {altRank && <span style={{ fontSize: 10, fontWeight: 800, color: altColor }}>#{altRank}</span>}
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{d.alternative_label}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748B' }}>{(d.mean_disagreement * 100).toFixed(1)}% avg variance</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: d.contested_criteria.length > 0 ? 4 : 0 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: `${altColor}88`, borderRadius: 3 }} />
                    </div>
                    {d.contested_criteria.length > 0 && (
                      <div style={{ fontSize: 10, color: '#FCD34D' }}>Contested on: {d.contested_criteria.join(', ')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: SENSITIVITY ══ */}
      {activeTab === 'sensitivity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <HelpCircle style={{ width: 14, height: 14, color: '#818CF8' }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>What Would Change the Decision?</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 14px', lineHeight: 1.5 }}>
              These criteria have the highest influence on the final ranking. Changing their weights would most likely shift the outcome.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orderedCriteria.slice(0, Math.min(5, orderedCriteria.length)).map((c, idx) => {
                const topContrib = top.criterion_contributions[c.criterion_id] ?? 0;
                const secondContrib = second ? (second.criterion_contributions[c.criterion_id] ?? 0) : 0;
                const gap = ((topContrib - secondContrib) * 100).toFixed(1);
                const gapNum = parseFloat(gap);
                const isContested = ranking.criterion_disagreements.find(d => d.criterion_id === c.criterion_id)?.contested;
                const wizCrit = wizardData?.crits.find(wc => wc.name === c.criterion_name);
                return (
                  <div key={c.criterion_id} style={{ borderRadius: 10, border: `1px solid ${isContested ? 'rgba(252,211,77,0.2)' : 'rgba(255,255,255,0.07)'}`, background: isContested ? 'rgba(252,211,77,0.04)' : 'rgba(255,255,255,0.02)', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#818CF8' }}>#{idx + 1} impact</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>{c.criterion_name}</span>
                          {isContested && <span style={{ fontSize: 9, color: '#FCD34D', background: 'rgba(252,211,77,0.1)', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>⚠ contested</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>
                          Weight: <strong style={{ color: '#A5B4FC' }}>{(c.weight_normalized * 100).toFixed(0)}%</strong>
                          {wizCrit && <span> · {wizCrit.direction === 'cost' ? '↓ minimize' : '↑ maximize'}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, lineHeight: 1.5 }}>
                      {gapNum > 0
                        ? <>On this criterion, <strong style={{ color: '#4ADE80' }}>{top.alternative_label}</strong> leads by <strong style={{ color: '#4ADE80' }}>+{gap}pts</strong> over {second?.alternative_label ?? 'next option'}.</>
                        : gapNum < 0
                        ? <><strong style={{ color: '#F97316' }}>{second?.alternative_label}</strong> actually scores higher on this criterion by <strong style={{ color: '#F97316' }}>{Math.abs(gapNum).toFixed(1)}pts</strong> — other criteria keep {top.alternative_label} ahead.</>
                        : <>Both top alternatives score equally on this criterion.</>
                      }
                    </div>
                    {isContested && (
                      <div style={{ fontSize: 11, color: '#FCD34D', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                        Experts significantly disagree on this criterion — if consensus shifted, the ranking could change.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {second && (
            <div style={card({ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' })}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6366F1', marginBottom: 10 }}>Overall Traceability</div>
              <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.65 }}>
                <strong style={{ color: '#F1F5F9' }}>{top.alternative_label}</strong> scores <strong style={{ color: '#4ADE80' }}>{(top.group_score * 100).toFixed(1)}%</strong> overall vs{' '}
                <strong style={{ color: '#F1F5F9' }}>{second.alternative_label}</strong> at <strong style={{ color: '#94A3B8' }}>{(second.group_score * 100).toFixed(1)}%</strong>.{' '}
                The {margin}pt margin means that if the top-impact criterion weight were halved, the result could flip. Decision is <strong style={{ color: strength.color }}>{strength.label.toLowerCase()}</strong>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
