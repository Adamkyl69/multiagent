import React, { useState } from 'react';
import {
  AlertTriangle, ChevronDown, ChevronRight,
  Trophy, Scale, Users, Zap, MessageSquare, Medal,
} from 'lucide-react';
import type { RankingResult } from './types';
import type { WizardSessionData } from './InlineDecisionWizard';

interface Props {
  ranking: RankingResult;
  wizardData: WizardSessionData | null;
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#CD853F', '#6366F1', '#22C55E', '#EC4899', '#14B8A6', '#8B5CF6'];
const MEDAL_LABELS = ['#1', '#2', '#3'];

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  padding: '16px 20px',
  ...extra,
});

const sectionTitle = (color = '#475569'): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  color,
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 7,
});

function strengthOf(ranking: RankingResult) {
  const alts = ranking.ranked_alternatives;
  if (alts.length < 2) return { score: 30, label: 'Insufficient', color: '#64748B', desc: 'Need 2+ alternatives to assess strength.' };
  const spread = (alts[0].group_score - alts[1].group_score) * 100;
  const total = ranking.criterion_disagreements.length || 1;
  const contested = ranking.criterion_disagreements.filter(d => d.contested).length;
  let score = 50 + spread * 2.5 - (contested / total) * 30;
  if (ranking.is_provisional) score -= 20;
  score = Math.max(5, Math.min(100, score));
  if (score >= 72) return { score, label: 'Strong', color: '#22C55E', desc: `${spread.toFixed(1)}pt lead, low expert disagreement.` };
  if (score >= 50) return { score, label: 'Moderate', color: '#F59E0B', desc: `${spread.toFixed(1)}pt lead, some contested criteria.` };
  if (score >= 28) return { score, label: 'Fragile', color: '#F97316', desc: `Only ${spread.toFixed(1)}pt lead, experts disagree on key criteria.` };
  return { score, label: 'Contested', color: '#EF4444', desc: `Razor-thin ${spread.toFixed(1)}pt margin, highly sensitive to weight changes.` };
}

export default function InlineDecisionResults({ ranking, wizardData }: Props) {
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
  const orderedCriteria = [...ranking.sensitivity].sort((a, b) => a.impact_rank - b.impact_rank);
  const expertIds = top ? Object.keys(top.expert_scores) : [];
  const colMax: Record<string, number> = {};
  orderedCriteria.forEach(c => {
    const vals = ranking.ranked_alternatives.map(a => a.criterion_contributions[c.criterion_id] ?? 0);
    colMax[c.criterion_id] = Math.max(...vals);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: 'DM Sans, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={card({ background: 'linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(139,92,246,0.08) 100%)', border: '1px solid rgba(99,102,241,0.25)', padding: '12px 18px' })}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale style={{ width: 15, height: 15, color: '#818CF8' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#818CF8' }}>MAGDM Decision Results</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {[{ v: ranking.ranked_alternatives.length, l: 'Options' }, { v: orderedCriteria.length, l: 'Criteria' }, { v: expertIds.length, l: 'Experts' }].map(s => (
              <div key={s.l} style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
            {ranking.is_provisional && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#FCD34D', background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.25)', borderRadius: 20, padding: '2px 9px', textTransform: 'uppercase' }}>Provisional</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 1. RANKING ── */}
      <div style={card()}>
        <div style={sectionTitle()}>
          <Medal style={{ width: 14, height: 14, color: '#F59E0B' }} />
          Ranking
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ranking.ranked_alternatives.map((alt) => {
            const color = RANK_COLORS[(alt.rank - 1) % RANK_COLORS.length];
            const medal = MEDAL_LABELS[alt.rank - 1] ?? `#${alt.rank}`;
            const altDisag = ranking.alternative_disagreements.find(d => d.alternative_id === alt.alternative_id);
            return (
              <div key={alt.alternative_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color, minWidth: 24, textAlign: 'center', flexShrink: 0 }}>{medal}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: alt.rank === 1 ? 700 : 500, color: alt.rank === 1 ? '#F1F5F9' : '#94A3B8' }}>{alt.alternative_label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {altDisag && altDisag.contested_criteria.length > 0 && (
                        <AlertTriangle style={{ width: 11, height: 11, color: '#FCD34D' }} />
                      )}
                      <span style={{ fontSize: 13, fontWeight: 800, color: alt.rank === 1 ? '#4ADE80' : '#64748B' }}>{(alt.group_score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ height: alt.rank === 1 ? 8 : 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${alt.group_score * 100}%`, background: alt.rank === 1 ? `linear-gradient(90deg,${color},#FDE68A)` : color, borderRadius: 4, transition: 'width 0.8s ease', opacity: alt.rank === 1 ? 1 : 0.6 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {margin && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#64748B' }}>
            <strong style={{ color: '#4ADE80' }}>{top.alternative_label}</strong> leads by{' '}
            <strong style={{ color: '#4ADE80' }}>+{margin}pt</strong> over {second?.alternative_label}
          </div>
        )}
      </div>

      {/* ── 2. SCORE BREAKDOWN ── */}
      <div style={card()}>
        <div style={sectionTitle()}>
          <ChevronRight style={{ width: 14, height: 14 }} />
          Score Breakdown
          <span style={{ fontSize: 10, fontWeight: 400, color: '#475569', marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }}>click to expand</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranking.ranked_alternatives.map((alt) => {
            const color = RANK_COLORS[(alt.rank - 1) % RANK_COLORS.length];
            const isExpanded = expandedAlt === alt.alternative_id;
            return (
              <div key={alt.alternative_id} style={{ borderRadius: 8, border: `1px solid ${alt.rank === 1 ? color + '33' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                <button onClick={() => setExpandedAlt(isExpanded ? null : alt.alternative_id)}
                  style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color, minWidth: 20 }}>#{alt.rank}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', flex: 1, textAlign: 'left' }}>{alt.alternative_label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: alt.rank === 1 ? '#4ADE80' : '#94A3B8' }}>{(alt.group_score * 100).toFixed(1)}%</span>
                  {isExpanded
                    ? <ChevronDown style={{ width: 13, height: 13, color: '#475569', flexShrink: 0 }} />
                    : <ChevronRight style={{ width: 13, height: 13, color: '#475569', flexShrink: 0 }} />}
                </button>
                {isExpanded && (
                  <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Contribution per criterion</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {orderedCriteria.map(c => {
                        const contrib = alt.criterion_contributions[c.criterion_id] ?? 0;
                        const maxC = colMax[c.criterion_id] || 1;
                        const pctW = (contrib / maxC) * 100;
                        const wizCrit = wizardData?.crits.find(wc => wc.name === c.criterion_name);
                        return (
                          <div key={c.criterion_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 11, color: '#94A3B8', width: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.criterion_name}</div>
                            <span style={{ fontSize: 9, color: wizCrit?.direction === 'cost' ? '#F97316' : '#818CF8', background: wizCrit?.direction === 'cost' ? 'rgba(249,115,22,0.12)' : 'rgba(99,102,241,0.12)', borderRadius: 3, padding: '1px 4px', flexShrink: 0, fontWeight: 600 }}>
                              {wizCrit?.direction === 'cost' ? '↓' : '↑'}
                            </span>
                            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pctW}%`, background: color, borderRadius: 3 }} />
                            </div>
                            <div style={{ fontSize: 10, color: '#64748B', minWidth: 30, textAlign: 'right', flexShrink: 0 }}>{(contrib * 100).toFixed(1)}</div>
                          </div>
                        );
                      })}
                    </div>
                    {expertIds.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expert scores</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {expertIds.map((eid, idx) => (
                            <div key={eid} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '4px 8px', textAlign: 'center', minWidth: 72 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color }}>{((alt.expert_scores[eid] ?? 0) * 100).toFixed(1)}%</div>
                              <div style={{ fontSize: 9, color: '#475569' }}>{wizardData?.experts[idx]?.name ?? `Expert ${idx + 1}`}</div>
                            </div>
                          ))}
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

      {/* ── 3. CRITERIA WEIGHTS ── */}
      <div style={card()}>
        <div style={sectionTitle()}>
          <Scale style={{ width: 14, height: 14, color: '#6366F1' }} />
          Criteria Weights
          <span style={{ fontSize: 10, fontWeight: 400, color: '#475569', marginLeft: 'auto', textTransform: 'none', letterSpacing: 0 }}>sorted by impact</span>
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
                    <span style={{ fontSize: 10, color: '#475569', minWidth: 18, fontWeight: 700 }}>#{idx + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>{c.criterion_name}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 3, color: isCost ? '#F97316' : '#818CF8', background: isCost ? 'rgba(249,115,22,0.12)' : 'rgba(99,102,241,0.12)' }}>
                      {isCost ? '↓ cost' : '↑ benefit'}
                    </span>
                    {isContested && <AlertTriangle style={{ width: 11, height: 11, color: '#FCD34D' }} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC' }}>{(c.weight_normalized * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.weight_normalized * 100}%`, background: isCost ? 'linear-gradient(90deg,#F97316,#FDBA74)' : 'linear-gradient(90deg,#6366F1,#A5B4FC)', borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. DISAGREEMENT INSIGHTS ── */}
      <div style={card()}>
        <div style={sectionTitle('#FCD34D')}>
          <Users style={{ width: 14, height: 14, color: '#FCD34D' }} />
          Disagreement Insights
        </div>
        {ranking.criterion_disagreements.length === 0 && ranking.alternative_disagreements.length === 0 ? (
          <div style={{ fontSize: 12, color: '#475569' }}>No disagreement data — all experts agreed.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ranking.criterion_disagreements.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>By criterion</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ranking.criterion_disagreements.map(d => {
                    const maxS = Math.max(...ranking.criterion_disagreements.map(x => x.stddev), 0.01);
                    return (
                      <div key={d.criterion_id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#F1F5F9' }}>{d.criterion_name}</span>
                            {d.contested && <span style={{ fontSize: 9, fontWeight: 700, color: '#FCD34D', background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.2)', borderRadius: 3, padding: '1px 5px' }}>HIGH VARIANCE</span>}
                          </div>
                          <span style={{ fontSize: 10, color: '#64748B' }}>σ={d.stddev.toFixed(3)}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(d.stddev / maxS) * 100}%`, background: d.contested ? 'linear-gradient(90deg,#F59E0B,#FCD34D)' : 'rgba(99,102,241,0.5)', borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {ranking.alternative_disagreements.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>By alternative</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ranking.alternative_disagreements.map(d => {
                    const maxD = Math.max(...ranking.alternative_disagreements.map(x => x.mean_disagreement), 0.01);
                    const altRank = ranking.ranked_alternatives.find(a => a.alternative_id === d.alternative_id)?.rank ?? 0;
                    const altColor = RANK_COLORS[(altRank - 1) % RANK_COLORS.length] || '#64748B';
                    return (
                      <div key={d.alternative_id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: altColor }}>#{altRank}</span>
                            <span style={{ fontSize: 12, color: '#F1F5F9' }}>{d.alternative_label}</span>
                          </div>
                          <span style={{ fontSize: 10, color: '#64748B' }}>{(d.mean_disagreement * 100).toFixed(1)}% variance</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(d.mean_disagreement / maxD) * 100}%`, background: `${altColor}88`, borderRadius: 2 }} />
                        </div>
                        {d.contested_criteria.length > 0 && (
                          <div style={{ fontSize: 10, color: '#FCD34D', marginTop: 2 }}>Contested on: {d.contested_criteria.join(', ')}</div>
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

      {/* ── 5. CONFIDENCE / FRAGILITY ── */}
      <div style={card({ border: `1px solid ${strength.color}33` })}>
        <div style={sectionTitle(strength.color)}>
          <Zap style={{ width: 14, height: 14, color: strength.color }} />
          Decision Confidence
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
            <svg viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)', width: 60, height: 60 }}>
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="30" cy="30" r="24" fill="none" stroke={strength.color} strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - strength.score / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: strength.color }}>{Math.round(strength.score)}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: strength.color, marginBottom: 4 }}>{strength.label}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5, maxWidth: 320 }}>{strength.desc}</div>
            {second && (
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                {margin}pt margin — if top-weighted criterion doubled in weight, outcome may shift
              </div>
            )}
          </div>
        </div>
        {ranking.is_provisional && ranking.provisional_reasons.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(252,211,77,0.06)', borderRadius: 8, padding: '8px 10px' }}>
            <AlertTriangle style={{ width: 12, height: 12, color: '#FCD34D', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{ranking.provisional_reasons.join(' · ')}</div>
          </div>
        )}
      </div>

      {/* ── 6. NARRATIVE EXPLANATION (last) ── */}
      {ranking.explanation && (
        <div style={card()}>
          <div style={sectionTitle()}>
            <MessageSquare style={{ width: 14, height: 14 }} />
            Narrative Explanation
          </div>
          <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.7, margin: 0 }}>{ranking.explanation}</p>
        </div>
      )}
    </div>
  );
}

