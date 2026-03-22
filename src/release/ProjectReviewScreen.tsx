import React, { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Play, Plus, Save, Trash2 } from 'lucide-react';

import { launchRun, updateProject } from './api';
import ModelSelector from './ModelSelector';
import type { AgentDraft, FlowStepDraft, ProjectResponse, RunResponse } from './types';

interface ProjectReviewScreenProps {
  token: string;
  project: ProjectResponse;
  onBack: () => void;
  onProjectUpdated: (project: ProjectResponse) => void;
  onRunLaunched: (run: RunResponse) => void;
}

function createBlankAgent(): AgentDraft {
  return {
    name: 'New Agent',
    role: 'Specialist',
    purpose: 'Define the perspective this agent represents.',
    instructions: 'Contribute domain-specific reasoning and challenge weak assumptions.',
    tone: 'balanced',
    tools: [],
    capabilities: {
      ask: true,
      challenge: true,
      cite: true,
      score: true,
      recommend: false,
    },
    model_provider: 'gemini',
    model_name: 'gemini-1.5-flash',
  };
}

function createBlankFlowStep(): FlowStepDraft {
  return {
    name: 'New Phase',
    description: 'Describe the purpose of this phase.',
    rules: {},
  };
}

export default function ProjectReviewScreen({
  token,
  project,
  onBack,
  onProjectUpdated,
  onRunLaunched,
}: ProjectReviewScreenProps) {
  const [draft, setDraft] = useState<ProjectResponse>(project);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAgent = draft.agents[selectedAgentIndex] ?? null;
  const estimatedRunCost = useMemo(() => Math.max(draft.agents.length * draft.flow.length, 3), [draft.agents.length, draft.flow.length]);

  function updateAgent(index: number, next: AgentDraft) {
    setDraft((current) => ({
      ...current,
      agents: current.agents.map((agent, agentIndex) => (agentIndex === index ? next : agent)),
    }));
  }

  function updateFlow(index: number, next: FlowStepDraft) {
    setDraft((current) => ({
      ...current,
      flow: current.flow.map((flow, flowIndex) => (flowIndex === index ? next : flow)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(token, draft.project_id, {
        title: draft.title,
        objective: draft.objective,
        status: draft.status,
        agents: draft.agents,
        flow: draft.flow,
      });
      setDraft(updated);
      onProjectUpdated(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save project changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    setError(null);
    try {
      const updated = await updateProject(token, draft.project_id, {
        title: draft.title,
        objective: draft.objective,
        status: 'ready',
        agents: draft.agents,
        flow: draft.flow,
      });
      setDraft(updated);
      onProjectUpdated(updated);
      const run = await launchRun(token, {
        project_id: updated.project_id,
        project_version_id: updated.latest_version_id,
      });
      onRunLaunched(run);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to launch debate run.');
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#06080F' }}>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full opacity-[0.22] blur-[80px] -top-[200px] -left-[100px]" style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }} />
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-[0.14] blur-[80px] -bottom-[150px] right-[200px]" style={{ background: 'radial-gradient(circle, #F97316 0%, transparent 70%)' }} />
        <div className="absolute w-[350px] h-[350px] rounded-full opacity-[0.08] blur-[80px] top-[40%] left-[38%]" style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }} />
      </div>

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={onBack} 
                className="rounded-lg border px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all duration-200 hover:scale-[1.02]"
                style={{ 
                  borderColor: 'rgba(255,255,255,0.07)', 
                  background: 'rgba(255,255,255,0.035)',
                  backdropFilter: 'blur(16px)',
                  color: '#F1F5F9'
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Back
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight" style={{ 
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: 'linear-gradient(160deg, #F1F5F9 30%, #94A3B8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Review & fine-tune your project
                </h1>
                <p className="text-xs sm:text-sm mt-1" style={{ color: '#64748B' }}>
                  Edit the generated agents, objective, and debate flow before launch.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                onClick={handleSave} 
                disabled={saving || launching} 
                className="flex-1 sm:flex-none rounded-lg border px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
                style={{ 
                  borderColor: 'rgba(255,255,255,0.07)', 
                  background: 'rgba(255,255,255,0.035)',
                  backdropFilter: 'blur(16px)',
                  color: '#F1F5F9'
                }}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">Save changes</span>
                <span className="sm:hidden">Save</span>
              </button>
              <button 
                onClick={handleLaunch} 
                disabled={saving || launching} 
                className="flex-1 sm:flex-none rounded-lg px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 hover:scale-[1.02]"
                style={{ 
                  background: 'linear-gradient(135deg, #EA580C, #F97316)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(249,115,22,0.3), 0 1px 3px rgba(0,0,0,0.4)'
                }}
              >
                {launching ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                Launch debate
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border px-4 py-3 text-xs sm:text-sm" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {/* Main Grid */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Left Column - Project Details & Flow */}
            <div className="space-y-4 sm:space-y-6 lg:col-span-1 xl:col-span-1">
              {/* Project Details */}
              <div className="rounded-2xl border p-4 sm:p-6 space-y-4 sm:space-y-5" style={{ 
                borderColor: 'rgba(255,255,255,0.07)', 
                background: 'rgba(255,255,255,0.035)',
                backdropFilter: 'blur(16px)'
              }}>
                <div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: '#475569' }}>
                    Project Title
                  </div>
                  <input 
                    value={draft.title} 
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} 
                    className="w-full rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg font-bold outline-none transition-all duration-200"
                    style={{ 
                      borderColor: 'rgba(255,255,255,0.07)', 
                      background: '#0B0E1A',
                      color: '#F1F5F9'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                  />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: '#475569' }}>
                    Objective
                  </div>
                  <textarea 
                    value={draft.objective} 
                    onChange={(event) => setDraft((current) => ({ ...current, objective: event.target.value }))} 
                    className="w-full h-24 sm:h-28 resize-none rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none transition-all duration-200"
                    style={{ 
                      borderColor: 'rgba(255,255,255,0.07)', 
                      background: '#0B0E1A',
                      color: '#F1F5F9'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                  />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: '#475569' }}>
                    Source Prompt
                  </div>
                  <p className="rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm" style={{ 
                    borderColor: 'rgba(255,255,255,0.07)', 
                    background: '#0B0E1A',
                    color: '#CBD5E1'
                  }}>
                    {draft.prompt}
                  </p>
                </div>
              </div>

              {/* Debate Flow */}
              <div className="rounded-2xl border p-4 sm:p-6" style={{ 
                borderColor: 'rgba(255,255,255,0.07)', 
                background: 'rgba(255,255,255,0.035)',
                backdropFilter: 'blur(16px)'
              }}>
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#475569' }}>
                    Debate Flow
                  </h2>
                  <button 
                    onClick={() => setDraft((current) => ({ ...current, flow: [...current.flow, createBlankFlowStep()] }))} 
                    className="rounded-lg border px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition-all duration-200 hover:scale-[1.02]"
                    style={{ 
                      borderColor: 'rgba(255,255,255,0.07)', 
                      background: 'rgba(255,255,255,0.035)',
                      color: '#F1F5F9'
                    }}
                  >
                    <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    Add phase
                  </button>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {draft.flow.map((flow, index) => (
                    <div key={`${flow.name}-${index}`} className="rounded-xl border p-3 sm:p-4 space-y-2 sm:space-y-3" style={{ 
                      borderColor: 'rgba(255,255,255,0.07)', 
                      background: '#0B0E1A'
                    }}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-[10px] sm:text-xs font-black flex-shrink-0" style={{ background: '#6366F1', color: '#fff' }}>
                          {index + 1}
                        </span>
                        <input 
                          value={flow.name} 
                          onChange={(event) => updateFlow(index, { ...flow, name: event.target.value })} 
                          className="flex-1 rounded-lg border px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold outline-none transition-all duration-200"
                          style={{ 
                            borderColor: 'rgba(255,255,255,0.07)', 
                            background: 'rgba(255,255,255,0.035)',
                            color: '#F1F5F9'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                        />
                        <button 
                          onClick={() => setDraft((current) => ({ ...current, flow: current.flow.filter((_, flowIndex) => flowIndex !== index) }))} 
                          className="rounded-lg border px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold transition-all duration-200 flex-shrink-0"
                          style={{ 
                            borderColor: 'rgba(239,68,68,0.3)', 
                            background: 'rgba(239,68,68,0.1)',
                            color: '#fca5a5'
                          }}
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                      <textarea 
                        value={flow.description} 
                        onChange={(event) => updateFlow(index, { ...flow, description: event.target.value })} 
                        className="w-full h-16 sm:h-20 resize-none rounded-lg border px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm outline-none transition-all duration-200"
                        style={{ 
                          borderColor: 'rgba(255,255,255,0.07)', 
                          background: 'rgba(255,255,255,0.035)',
                          color: '#F1F5F9'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Column - Agents */}
            <div className="rounded-2xl border p-4 sm:p-6 lg:col-span-1 xl:col-span-1" style={{ 
              borderColor: 'rgba(255,255,255,0.07)', 
              background: 'rgba(255,255,255,0.035)',
              backdropFilter: 'blur(16px)'
            }}>
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h2 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#475569' }}>
                  Agents
                </h2>
                <button 
                  onClick={() => setDraft((current) => ({ ...current, agents: [...current.agents, createBlankAgent()] }))} 
                  className="rounded-lg border px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition-all duration-200 hover:scale-[1.02]"
                  style={{ 
                    borderColor: 'rgba(255,255,255,0.07)', 
                    background: 'rgba(255,255,255,0.035)',
                    color: '#F1F5F9'
                  }}
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Add agent
                </button>
              </div>
              <div className="grid gap-2 sm:gap-3">
                {draft.agents.map((agent, index) => (
                  <button
                    key={`${agent.name}-${index}`}
                    type="button"
                    onClick={() => setSelectedAgentIndex(index)}
                    className="rounded-xl border px-3 sm:px-4 py-3 sm:py-4 text-left transition-all duration-200 hover:scale-[1.01]"
                    style={selectedAgentIndex === index ? { 
                      borderColor: 'rgba(99,102,241,0.35)', 
                      background: 'rgba(99,102,241,0.12)'
                    } : { 
                      borderColor: 'rgba(255,255,255,0.07)', 
                      background: '#0B0E1A'
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold truncate" style={{ color: '#F1F5F9' }}>
                          {agent.name}
                        </div>
                        <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate" style={{ color: '#64748B' }}>
                          {agent.role}
                        </div>
                      </div>
                      <span className="rounded-full px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] flex-shrink-0" style={{ 
                        background: 'rgba(255,255,255,0.08)', 
                        color: '#94A3B8'
                      }}>
                        {agent.tone}
                      </span>
                    </div>
                    <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs line-clamp-2" style={{ color: '#64748B' }}>
                      {agent.purpose}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column - Selected Agent & Launch Readiness */}
            <div className="space-y-4 sm:space-y-6 lg:col-span-2 xl:col-span-1">
              {/* Selected Agent */}
              <div className="rounded-2xl border p-4 sm:p-6 space-y-3 sm:space-y-4" style={{ 
                borderColor: 'rgba(255,255,255,0.07)', 
                background: 'rgba(255,255,255,0.035)',
                backdropFilter: 'blur(16px)'
              }}>
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#475569' }}>
                  Selected Agent
                </div>
                {selectedAgent ? (
                  <>
                    <input 
                      value={selectedAgent.name} 
                      onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, name: event.target.value })} 
                      placeholder="Agent Name"
                      className="w-full rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold outline-none transition-all duration-200"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.07)', 
                        background: '#0B0E1A',
                        color: '#F1F5F9'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                    />
                    <input 
                      value={selectedAgent.role} 
                      onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, role: event.target.value })} 
                      placeholder="Role"
                      className="w-full rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none transition-all duration-200"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.07)', 
                        background: '#0B0E1A',
                        color: '#F1F5F9'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                    />
                    <textarea 
                      value={selectedAgent.purpose} 
                      onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, purpose: event.target.value })} 
                      placeholder="Purpose"
                      className="w-full h-20 sm:h-24 resize-none rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none transition-all duration-200"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.07)', 
                        background: '#0B0E1A',
                        color: '#F1F5F9'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                    />
                    <textarea 
                      value={selectedAgent.instructions} 
                      onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, instructions: event.target.value })} 
                      placeholder="Instructions"
                      className="w-full h-32 sm:h-40 resize-none rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none transition-all duration-200"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.07)', 
                        background: '#0B0E1A',
                        color: '#F1F5F9'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                    />
                    <input 
                      value={selectedAgent.tone} 
                      onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, tone: event.target.value })} 
                      placeholder="Tone"
                      className="w-full rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none transition-all duration-200"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.07)', 
                        background: '#0B0E1A',
                        color: '#F1F5F9'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.07)'}
                    />
                    <ModelSelector
                      value={{ provider: selectedAgent.model_provider, model: selectedAgent.model_name }}
                      onChange={(provider, model) =>
                        updateAgent(selectedAgentIndex, {
                          ...selectedAgent,
                          model_provider: provider,
                          model_name: model,
                        })
                      }
                    />
                    <button 
                      onClick={() => setDraft((current) => ({ ...current, agents: current.agents.filter((_, index) => index !== selectedAgentIndex) }))} 
                      className="w-full rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01]"
                      style={{ 
                        borderColor: 'rgba(239,68,68,0.3)', 
                        background: 'rgba(239,68,68,0.1)',
                        color: '#fca5a5'
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Remove agent
                    </button>
                  </>
                ) : (
                  <div className="text-xs sm:text-sm" style={{ color: '#64748B' }}>
                    Select an agent to edit its instructions and role.
                  </div>
                )}
              </div>

              {/* Launch Readiness */}
              <div className="rounded-2xl border p-4 sm:p-6 space-y-3 sm:space-y-4" style={{ 
                borderColor: 'rgba(255,255,255,0.07)', 
                background: 'rgba(255,255,255,0.035)',
                backdropFilter: 'blur(16px)'
              }}>
                <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em]" style={{ color: '#475569' }}>
                  Launch Readiness
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span style={{ color: '#64748B' }}>Agents configured</span>
                  <span className="font-bold" style={{ color: '#F1F5F9' }}>{draft.agents.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span style={{ color: '#64748B' }}>Flow phases</span>
                  <span className="font-bold" style={{ color: '#F1F5F9' }}>{draft.flow.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span style={{ color: '#64748B' }}>Est. run cost</span>
                  <span className="font-bold" style={{ color: '#F1F5F9' }}>${(estimatedRunCost / 100).toFixed(2)}</span>
                </div>
                {draft.assumptions.length > 0 ? (
                  <div className="rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm flex items-start gap-2" style={{ 
                    borderColor: 'rgba(245,158,11,0.3)', 
                    background: 'rgba(245,158,11,0.1)',
                    color: '#fcd34d'
                  }}>
                    <span className="text-base sm:text-lg">⚠️</span>
                    <span>{draft.assumptions.length} assumption(s) still need review.</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
