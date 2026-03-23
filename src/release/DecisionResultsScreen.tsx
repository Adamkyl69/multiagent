import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import type {
  AlternativeScoreDetail,
  CriterionDisagreement,
  DecisionSessionResponse,
  RankingResult,
} from './types';

interface AltDraft { label: string; description: string; }
interface CritDraft { name: string; description: string; direction: 'benefit' | 'cost'; weight: number; }
interface ExpDraft { name: string; role: string; description: string; }

interface Props {
  token: string;
  session: DecisionSessionResponse;
  ranking: RankingResult;
  alternatives: AltDraft[];
  criteria: CritDraft[];
  experts: ExpDraft[];
  onBack: () => void;
  onRerun: () => void;
}

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.035)',
  backdropFilter: 'blur(16px)',
  padding: '20px 24px',
};

const RANK_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6', '#8B5CF6', '#EF4444', '#0EA5E9'];

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${Math.round(value * 100)}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function ScoreLabel({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#4ADE80' : pct >= 50 ? '#FCD34D' : '#F87171';
  return <span style={{ fontWeight: 700, color, fontSize: 13 }}>{pct}%</span>;
}

function RankBadge({ rank, provisional }: { rank: number; provisional: boolean }) {
  const color = RANK_COLORS[(rank - 1) % RANK_COLORS.length];
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: rank === 1 ? `${color}33` : 'rgba(255,255,255,0.05)',
      border: `1px solid ${rank === 1 ? color : 'rgba(255,255,255,0.1)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700,
      color: rank === 1 ? color : '#64748B',
    }}>
      {provisional && rank === 1 ? '?' : rank}
    </div>
  );
}

export default function DecisionResultsScreen({ session, ranking, alternatives, criteria, experts, onBack, onRerun }: Props) {
  const [expandedAlt, setExpandedAlt] = useState<string | null>(ranking.ranked_alternatives[0]?.alternative_id ?? null);
  const [showEvalMatrix, setShowEvalMatrix] = useState(false);

  const critMap: Record<string, CritDraft> = {};
  const altMap: Record<string, AltDraft> = {};
  const expMap: Record<string, ExpDraft> = {};

  // Build maps from position order (criteria/alternatives/experts arrays match by position to IDs)
  // We use ranking data directly for labels since it carries alternative_label

  if (!ranking.is_complete) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#06080F', padding: '32px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...cardStyle, maxWidth: 500, textAlign: 'center' }}>
          <AlertTriangle style={{ width: 32, height: 32, color: '#FCD34D', margin: '0 auto 16px' }} />
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#F1F5F9', marginBottom: 12 }}>Cannot rank yet</h2>
          <ul style={{ textAlign: 'left', margin: '0 0 20px', paddingLeft: 20 }}>
            {ranking.completion_errors.map((e, i) => (
              <li key={i} style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6 }}>{e}</li>
            ))}
          </ul>
          <button onClick={onRerun} style={{ borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.2)', color: '#C7D2FE', padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Back to Setup
          </button>
        </div>
      </div>
    );
  }

  const top = ranking.ranked_alternatives[0];
  const second = ranking.ranked_alternatives[1];
  const scoreDelta = top && second ? top.group_score - second.group_score : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#06080F', padding: '24px 32px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={onBack} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748B', padding: '6px 12px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Decisions
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>
            {session.title}
          </div>
          <div style={{ fontSize: 12, color: '#475569' }}>Ranked {new Date(ranking.computed_at).toLocaleDateString()}</div>
        </div>
        <button onClick={onRerun} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748B', padding: '7px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Re-evaluate
        </button>
      </div>

      {/* Provisional warning */}
      {ranking.is_provisional && (
        <div style={{ borderRadius: 12, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.07)', padding: '12px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle style={{ width: 16, height: 16, color: '#FCD34D', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FCD34D', marginBottom: 4 }}>Provisional Ranking</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {ranking.provisional_reasons.map((r, i) => (
                <li key={i} style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* Left: Ranking + breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top recommendation */}
          {top && (
            <div style={{ ...cardStyle, border: `1px solid ${RANK_COLORS[0]}33`, background: `${RANK_COLORS[0]}0A` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <CheckCircle style={{ width: 18, height: 18, color: RANK_COLORS[0] }} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366F1' }}>
                  {ranking.is_provisional ? 'Provisional Recommendation' : 'Recommendation'}
                </span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>
                {top.alternative_label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <ScoreLabel score={top.group_score} />
                <span style={{ fontSize: 11, color: '#475569' }}>group score</span>
                {second && <span style={{ fontSize: 11, color: '#475569' }}>+{(scoreDelta * 100).toFixed(1)}pp over #{2}</span>}
              </div>
              <ScoreBar value={top.group_score} color={RANK_COLORS[0]} />
            </div>
          )}

          {/* All alternatives ranked */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 16 }}>
              Ranked Alternatives
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranking.ranked_alternatives.map((alt) => {
                const isExpanded = expandedAlt === alt.alternative_id;
                const color = RANK_COLORS[(alt.rank - 1) % RANK_COLORS.length];
                return (
                  <div key={alt.alternative_id}>
                    <button
                      onClick={() => setExpandedAlt(isExpanded ? null : alt.alternative_id)}
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.15s' }}>
                        <RankBadge rank={alt.rank} provisional={alt.is_provisional} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>{alt.alternative_label}</div>
                          <ScoreBar value={alt.group_score} color={color} />
                        </div>
                        <ScoreLabel score={alt.group_score} />
                        {isExpanded ? <ChevronDown style={{ width: 14, height: 14, color: '#475569' }} /> : <ChevronRight style={{ width: 14, height: 14, color: '#475569' }} />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '8px 14px 12px 54px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {/* Criterion contributions */}
                        {Object.entries(alt.criterion_contributions)
                          .sort((a, b) => b[1] - a[1])
                          .map(([critId, contribution]) => {
                            const critName = criteria[ranking.sensitivity.findIndex(s => s.criterion_id === critId)]?.name
                              ?? ranking.sensitivity.find(s => s.criterion_id === critId)?.criterion_name
                              ?? critId;
                            return (
                              <div key={critId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontSize: 11, color: '#94A3B8', minWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{critName}</div>
                                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${Math.round(contribution * 100 / (ranking.sensitivity[0]?.weight_normalized ?? 0.2))}%`, background: color, borderRadius: 2 }} />
                                </div>
                                <div style={{ fontSize: 10, color: '#64748B', minWidth: 32, textAlign: 'right' }}>{(contribution * 100).toFixed(1)}</div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Explanation */}
          {ranking.explanation && (
            <div style={{ ...cardStyle, borderColor: 'rgba(99,102,241,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366F1', marginBottom: 12 }}>
                Analysis
              </div>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, margin: 0 }}>
                {ranking.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Sidebar panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Sensitivity */}
          {ranking.sensitivity.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 12 }}>
                Most Influential Criteria
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ranking.sensitivity.map((item) => (
                  <div key={item.criterion_id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>#{item.impact_rank} {item.criterion_name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#A5B4FC' }}>{(item.weight_normalized * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(item.weight_normalized * 100)}%`, background: 'rgba(99,102,241,0.5)', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disagreement */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 12 }}>
              Expert Disagreement
            </div>
            {ranking.criterion_disagreements.length === 0 ? (
              <div style={{ fontSize: 12, color: '#475569' }}>No evaluations yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ranking.criterion_disagreements.map((d) => (
                  <div key={d.criterion_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: d.contested ? '#FCD34D' : '#64748B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.contested && '⚠ '}{d.criterion_name}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: d.contested ? '#FCD34D' : '#475569' }}>
                      σ {d.stddev.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {ranking.criterion_disagreements.some(d => d.contested) && (
              <div style={{ marginTop: 10, fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
                ⚠ Contested criteria have high variance across experts. Consider adding evidence or re-weighting.
              </div>
            )}
          </div>

          {/* Session info */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 10 }}>
              Session
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 11, color: '#64748B' }}>{ranking.ranked_alternatives.length} alternatives · {ranking.sensitivity.length} criteria</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>{experts.length} expert evaluator{experts.length !== 1 ? 's' : ''} · equal weights</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Aggregation: weighted sum (absolute normalization)</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Provisional threshold: Δ ≤ 0.03</div>
            </div>
          </div>

          {/* Score anchor legend */}
          <div style={cardStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: 10 }}>
              Score Scale
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { range: '1–2', label: 'Very weak', color: '#F87171' },
                { range: '3–4', label: 'Weak', color: '#FB923C' },
                { range: '5–6', label: 'Moderate', color: '#FCD34D' },
                { range: '7–8', label: 'Strong', color: '#86EFAC' },
                { range: '9–10', label: 'Excellent', color: '#4ADE80' },
              ].map(item => (
                <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.color, minWidth: 28 }}>{item.range}</span>
                  <span style={{ fontSize: 11, color: '#64748B' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
