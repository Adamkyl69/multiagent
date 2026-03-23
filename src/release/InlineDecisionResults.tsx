import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { RankingResult } from './types';

interface Props {
  ranking: RankingResult;
}

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  padding: '14px 18px',
  marginBottom: 10,
};

const RANK_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6'];

export default function InlineDecisionResults({ ranking }: Props) {
  const [expandedAlt, setExpandedAlt] = useState<string | null>(ranking.ranked_alternatives[0]?.alternative_id ?? null);

  if (!ranking.is_complete) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle style={{ width: 16, height: 16, color: '#FCD34D', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#FCD34D', marginBottom: 6 }}>Cannot rank</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#94A3B8' }}>
              {ranking.completion_errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const top = ranking.ranked_alternatives[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Provisional warning */}
      {ranking.is_provisional && (
        <div style={{ borderRadius: 10, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.07)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle style={{ width: 14, height: 14, color: '#FCD34D', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#FCD34D', marginBottom: 4 }}>Provisional Result</div>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
              {ranking.provisional_reasons.join(' • ')}
            </div>
          </div>
        </div>
      )}

      {/* Top recommendation */}
      {top && (
        <div style={{ ...cardStyle, border: `1px solid ${RANK_COLORS[0]}33`, background: `${RANK_COLORS[0]}0A` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle style={{ width: 16, height: 16, color: RANK_COLORS[0] }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366F1' }}>
              {ranking.is_provisional ? 'Provisional' : 'Recommendation'}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>{top.alternative_label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80' }}>{Math.round(top.group_score * 100)}%</span>
            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(top.group_score * 100)}%`, background: RANK_COLORS[0], borderRadius: 3 }} />
            </div>
          </div>
        </div>
      )}

      {/* All alternatives */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569', marginBottom: 10 }}>
          All Options
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranking.ranked_alternatives.map((alt) => {
            const isExpanded = expandedAlt === alt.alternative_id;
            const color = RANK_COLORS[(alt.rank - 1) % RANK_COLORS.length];
            return (
              <div key={alt.alternative_id}>
                <button
                  onClick={() => setExpandedAlt(isExpanded ? null : alt.alternative_id)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: alt.rank === 1 ? `${color}33` : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${alt.rank === 1 ? color : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      color: alt.rank === 1 ? color : '#64748B',
                    }}>{alt.rank}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 3 }}>{alt.alternative_label}</div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round(alt.group_score * 100)}%`, background: color, borderRadius: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: alt.rank === 1 ? '#4ADE80' : '#64748B' }}>
                      {Math.round(alt.group_score * 100)}%
                    </span>
                    {isExpanded ? <ChevronDown style={{ width: 13, height: 13, color: '#475569' }} /> : <ChevronRight style={{ width: 13, height: 13, color: '#475569' }} />}
                  </div>
                </button>

                {isExpanded && (
                  <div style={{ padding: '6px 10px 8px 42px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {Object.entries(alt.criterion_contributions)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([critId, contribution]) => {
                        const critName = ranking.sensitivity.find(s => s.criterion_id === critId)?.criterion_name ?? critId;
                        return (
                          <div key={critId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 10, color: '#94A3B8', minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{critName}</div>
                            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.round(contribution * 500)}%`, background: color, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 9, color: '#64748B', minWidth: 24, textAlign: 'right' }}>{(contribution * 100).toFixed(1)}</div>
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
        <div style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6366F1', marginBottom: 8 }}>
            Analysis
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
            {ranking.explanation}
          </p>
        </div>
      )}

      {/* Disagreement summary */}
      {ranking.criterion_disagreements.some(d => d.contested) && (
        <div style={cardStyle}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FCD34D', marginBottom: 8 }}>
            Expert Disagreement
          </div>
          <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
            High variance on: {ranking.criterion_disagreements.filter(d => d.contested).map(d => d.criterion_name).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
