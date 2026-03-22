import React, { useEffect, useState } from 'react';
import { BookmarkCheck, Loader2, Plus, Star, Trash2, Edit2, X, Check, AlertTriangle } from 'lucide-react';

import { createExpertAgent, deleteExpertTemplate, listExpertTemplates, updateExpertTemplate } from './api';
import ModelSelector from './ModelSelector';
import type { ExpertTemplateResponse } from './types';

const DECISION_DOMAINS = [
  'pricing', 'hiring', 'product', 'market_expansion', 'health',
  'investment', 'operations', 'strategy', 'technology', 'legal',
  'marketing', 'partnerships', 'organizational', 'personal',
];

interface ExpertAgentsViewProps {
  token: string;
}

export default function ExpertAgentsView({ token }: ExpertAgentsViewProps) {
  const [templates, setTemplates] = useState<ExpertTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<ExpertTemplateResponse>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    name: '',
    role: '',
    purpose: '',
    instructions: '',
    tone: 'balanced',
    model_provider: 'gemini',
    model_name: 'gemini-1.5-flash',
    decision_domains: [] as string[],
    performance_note: '',
  });
  const [creating, setCreating] = useState(false);
  const limit = 15;

  useEffect(() => {
    setLoading(true);
    listExpertTemplates(token, filterDomain ?? undefined)
      .then((res) => { setTemplates(res.templates); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load templates'))
      .finally(() => setLoading(false));
  }, [token, filterDomain]);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  function startEdit() {
    if (!selected) return;
    setEditDraft({
      name: selected.name,
      role: selected.role,
      purpose: selected.purpose,
      instructions: selected.instructions,
      tone: selected.tone,
      decision_domains: [...selected.decision_domains],
      performance_note: selected.performance_note ?? '',
    });
    setEditing(true);
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateExpertTemplate(token, selectedId, editDraft);
      setTemplates((prev) => prev.map((t) => (t.id === selectedId ? updated : t)));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    setError(null);
    try {
      await deleteExpertTemplate(token, id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) { setSelectedId(null); setEditing(false); }
      setDeleteConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete template');
    } finally {
      setDeleting(false);
    }
  }

  function toggleEditDomain(domain: string) {
    setEditDraft((prev) => {
      const current = prev.decision_domains ?? [];
      return {
        ...prev,
        decision_domains: current.includes(domain)
          ? current.filter((d) => d !== domain)
          : current.length < 3 ? [...current, domain] : current,
      };
    });
  }

  function toggleCreateDomain(domain: string) {
    setCreateDraft((prev) => ({
      ...prev,
      decision_domains: prev.decision_domains.includes(domain)
        ? prev.decision_domains.filter((d) => d !== domain)
        : prev.decision_domains.length < 3 ? [...prev.decision_domains, domain] : prev.decision_domains,
    }));
  }

  async function handleCreate() {
    if (createDraft.name.length === 0 || createDraft.role.length === 0 || createDraft.purpose.length < 10 || createDraft.instructions.length < 20 || createDraft.decision_domains.length === 0) {
      setError('Please fill all required fields with minimum lengths');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const newAgent = await createExpertAgent(token, createDraft);
      setTemplates((prev) => [newAgent, ...prev]);
      setShowCreateForm(false);
      setCreateDraft({
        name: '',
        role: '',
        purpose: '',
        instructions: '',
        tone: 'balanced',
        model_provider: 'gemini',
        model_name: 'gemini-1.5-flash',
        decision_domains: [],
        performance_note: '',
      });
      setSelectedId(newAgent.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.035)',
    backdropFilter: 'blur(16px)',
    padding: '20px 24px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.07)',
    background: '#0B0E1A',
    color: '#F1F5F9',
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              background: 'linear-gradient(160deg, #F1F5F9 30%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Expert Agents
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              Reusable expert perspectives — saved from debates or created manually. {templates.length}/{limit} slots used.
            </p>
          </div>
          <button
            onClick={() => { setShowCreateForm(true); setSelectedId(null); setEditing(false); }}
            disabled={templates.length >= limit}
            style={{
              borderRadius: 10,
              border: '1px solid rgba(99,102,241,0.4)',
              background: 'rgba(99,102,241,0.2)',
              color: '#C7D2FE',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: templates.length >= limit ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: templates.length >= limit ? 0.5 : 1,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Create Agent
          </button>
        </div>

        {error && (
          <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', padding: '10px 16px', fontSize: 13, color: '#fca5a5', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Domain filter */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          <button
            onClick={() => setFilterDomain(null)}
            style={{
              borderRadius: 20,
              border: `1px solid ${!filterDomain ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
              background: !filterDomain ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: !filterDomain ? '#A5B4FC' : '#64748B',
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {DECISION_DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDomain(filterDomain === d ? null : d)}
              style={{
                borderRadius: 20,
                border: `1px solid ${filterDomain === d ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                background: filterDomain === d ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: filterDomain === d ? '#A5B4FC' : '#64748B',
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {d.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <Loader2 style={{ width: 24, height: 24, color: '#6366F1', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : templates.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
            <Star style={{ width: 32, height: 32, color: '#475569', margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>
              No expert agents yet
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', maxWidth: 400, margin: '0 auto' }}>
              Create expert agents manually or save your best-performing agents from completed debates.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selected || showCreateForm ? '1fr 1.2fr' : '1fr', gap: 20 }}>
            {/* Template list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); setEditing(false); }}
                  style={{
                    ...cardStyle,
                    padding: '14px 18px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderColor: selectedId === t.id ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)',
                    background: selectedId === t.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.035)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: '#F1F5F9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.role}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.total_ratings > 0 && t.helpful_rate >= 0.7 ? '#4ADE80' : '#94A3B8' }}>
                        {t.total_ratings > 0 ? `${Math.round(t.helpful_rate * 100)}%` : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569' }}>{t.times_used}x used</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {t.decision_domains.map((d) => (
                      <span key={d} style={{ borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: '#A5B4FC', textTransform: 'capitalize' }}>
                        {d.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Create form panel */}
            {showCreateForm && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>Create Expert Agent</span>
                    <button onClick={() => setShowCreateForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Name *</label>
                    <input value={createDraft.name} onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., Risk Assessment Specialist" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Role *</label>
                    <input value={createDraft.role} onChange={(e) => setCreateDraft((p) => ({ ...p, role: e.target.value }))} placeholder="e.g., Identifies and evaluates potential risks" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Purpose * (min 10 chars)</label>
                    <textarea value={createDraft.purpose} onChange={(e) => setCreateDraft((p) => ({ ...p, purpose: e.target.value }))} placeholder="Explain the decision-making value this agent provides..." style={{ ...inputStyle, height: 64, resize: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Instructions * (min 20 chars)</label>
                    <textarea value={createDraft.instructions} onChange={(e) => setCreateDraft((p) => ({ ...p, instructions: e.target.value }))} placeholder="Describe specific reasoning approach, focus areas, and decision criteria..." style={{ ...inputStyle, height: 100, resize: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tone</label>
                    <input value={createDraft.tone} onChange={(e) => setCreateDraft((p) => ({ ...p, tone: e.target.value }))} placeholder="balanced" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Model</label>
                    <ModelSelector
                      value={{ provider: createDraft.model_provider, model: createDraft.model_name }}
                      onChange={(provider, model) => setCreateDraft((p) => ({ ...p, model_provider: provider, model_name: model }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Decision Domains * (1-3)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {DECISION_DOMAINS.map((d) => (
                        <button
                          key={d}
                          onClick={() => toggleCreateDomain(d)}
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${createDraft.decision_domains.includes(d) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                            background: createDraft.decision_domains.includes(d) ? 'rgba(99,102,241,0.2)' : 'transparent',
                            color: createDraft.decision_domains.includes(d) ? '#A5B4FC' : '#64748B',
                            padding: '3px 10px',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                          }}
                        >
                          {d.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Performance Note (optional)</label>
                    <textarea value={createDraft.performance_note} onChange={(e) => setCreateDraft((p) => ({ ...p, performance_note: e.target.value }))} placeholder="Why this agent design is valuable..." style={{ ...inputStyle, height: 50, resize: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      style={{
                        borderRadius: 10,
                        border: '1px solid rgba(99,102,241,0.4)',
                        background: 'rgba(99,102,241,0.2)',
                        color: '#C7D2FE',
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        opacity: creating ? 0.5 : 1,
                      }}
                    >
                      {creating ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Plus style={{ width: 14, height: 14 }} />}
                      Create Agent
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      style={{
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.07)',
                        background: 'transparent',
                        color: '#64748B',
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Detail panel */}
            {selected && (
              <div style={cardStyle}>
                {editing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569' }}>Editing Template</span>
                      <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Name</label>
                      <input value={editDraft.name ?? ''} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Role</label>
                      <input value={editDraft.role ?? ''} onChange={(e) => setEditDraft((p) => ({ ...p, role: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Purpose</label>
                      <textarea value={editDraft.purpose ?? ''} onChange={(e) => setEditDraft((p) => ({ ...p, purpose: e.target.value }))} style={{ ...inputStyle, height: 64, resize: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Instructions</label>
                      <textarea value={editDraft.instructions ?? ''} onChange={(e) => setEditDraft((p) => ({ ...p, instructions: e.target.value }))} style={{ ...inputStyle, height: 100, resize: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Tone</label>
                      <input value={editDraft.tone ?? ''} onChange={(e) => setEditDraft((p) => ({ ...p, tone: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Decision Domains (1-3)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {DECISION_DOMAINS.map((d) => (
                          <button
                            key={d}
                            onClick={() => toggleEditDomain(d)}
                            style={{
                              borderRadius: 14,
                              border: `1px solid ${(editDraft.decision_domains ?? []).includes(d) ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                              background: (editDraft.decision_domains ?? []).includes(d) ? 'rgba(99,102,241,0.2)' : 'transparent',
                              color: (editDraft.decision_domains ?? []).includes(d) ? '#A5B4FC' : '#64748B',
                              padding: '3px 10px',
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                              textTransform: 'capitalize',
                            }}
                          >
                            {d.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          borderRadius: 10,
                          border: '1px solid rgba(99,102,241,0.4)',
                          background: 'rgba(99,102,241,0.2)',
                          color: '#C7D2FE',
                          padding: '8px 16px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        {saving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Check style={{ width: 14, height: 14 }} />}
                        Save changes
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        style={{
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.07)',
                          background: 'transparent',
                          color: '#64748B',
                          padding: '8px 16px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: '#F1F5F9' }}>{selected.name}</h2>
                        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>{selected.role}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={startEdit} style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.035)', color: '#94A3B8', padding: '6px 8px', cursor: 'pointer' }}>
                          <Edit2 style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => setDeleteConfirm(selected.id)} style={{ borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', padding: '6px 8px', cursor: 'pointer' }}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#0B0E1A', padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>{selected.times_used}</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Times used</div>
                      </div>
                      <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#0B0E1A', padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: selected.helpful_rate >= 0.7 ? '#4ADE80' : '#F1F5F9' }}>
                          {selected.total_ratings > 0 ? `${Math.round(selected.helpful_rate * 100)}%` : '—'}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Helpful rate</div>
                      </div>
                      <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: '#0B0E1A', padding: '10px 14px', flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>{selected.total_ratings}</div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Ratings</div>
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 6 }}>Purpose</div>
                      <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.6 }}>{selected.purpose}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 6 }}>Instructions</div>
                      <p style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.instructions}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 6 }}>Tone</div>
                      <span style={{ borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#94A3B8', textTransform: 'capitalize' }}>{selected.tone}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 6 }}>Decision Domains</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {selected.decision_domains.map((d) => (
                          <span key={d} style={{ borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(99,102,241,0.12)', color: '#A5B4FC', textTransform: 'capitalize' }}>
                            {d.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selected.performance_note && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#475569', marginBottom: 6 }}>Why it was saved</div>
                        <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.6, fontStyle: 'italic' }}>"{selected.performance_note}"</p>
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      Model: {selected.model_provider}/{selected.model_name} · Created {new Date(selected.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Delete confirmation */}
                {deleteConfirm === selected.id && (
                  <div style={{ marginTop: 16, borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <AlertTriangle style={{ width: 14, height: 14, color: '#fca5a5' }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>Delete "{selected.name}"?</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
                      {selected.times_used > 0
                        ? `This template has been used ${selected.times_used} time(s). This action cannot be undone.`
                        : 'This action cannot be undone.'}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleDelete(selected.id)}
                        disabled={deleting}
                        style={{ borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: '#64748B', padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
