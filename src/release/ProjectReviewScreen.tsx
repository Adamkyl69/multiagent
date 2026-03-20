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
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold hover:border-indigo-500 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Review and fine-tune your project</h1>
              <p className="text-sm text-slate-400 mt-1">Edit the generated agents, objective, and debate flow before launch.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving || launching} className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-bold hover:border-indigo-500 inline-flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </button>
            <button onClick={handleLaunch} disabled={saving || launching} className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold hover:bg-indigo-500 inline-flex items-center gap-2 disabled:opacity-50">
              {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Launch debate
            </button>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Project title</div>
                <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xl font-bold outline-none focus:border-indigo-500" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Objective</div>
                <textarea value={draft.objective} onChange={(event) => setDraft((current) => ({ ...current, objective: event.target.value }))} className="mt-2 h-28 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Source prompt</div>
                <p className="mt-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">{draft.prompt}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Debate flow</h2>
                <button onClick={() => setDraft((current) => ({ ...current, flow: [...current.flow, createBlankFlowStep()] }))} className="rounded-xl border border-slate-800 px-3 py-2 text-xs font-bold hover:border-indigo-500 inline-flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Add phase
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {draft.flow.map((flow, index) => (
                  <div key={`${flow.name}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-black">{index + 1}</span>
                      <input value={flow.name} onChange={(event) => updateFlow(index, { ...flow, name: event.target.value })} className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold outline-none focus:border-indigo-500" />
                      <button onClick={() => setDraft((current) => ({ ...current, flow: current.flow.filter((_, flowIndex) => flowIndex !== index) }))} className="rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea value={flow.description} onChange={(event) => updateFlow(index, { ...flow, description: event.target.value })} className="h-20 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Agents</h2>
              <button onClick={() => setDraft((current) => ({ ...current, agents: [...current.agents, createBlankAgent()] }))} className="rounded-xl border border-slate-800 px-3 py-2 text-xs font-bold hover:border-indigo-500 inline-flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                Add agent
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              {draft.agents.map((agent, index) => (
                <button
                  key={`${agent.name}-${index}`}
                  type="button"
                  onClick={() => setSelectedAgentIndex(index)}
                  className={`rounded-2xl border px-4 py-4 text-left ${selectedAgentIndex === index ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{agent.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{agent.role}</div>
                    </div>
                    <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">{agent.tone}</span>
                  </div>
                  <div className="mt-3 text-xs text-slate-400 line-clamp-2">{agent.purpose}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Selected agent</div>
              {selectedAgent ? (
                <>
                  <input value={selectedAgent.name} onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, name: event.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500" />
                  <input value={selectedAgent.role} onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, role: event.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                  <textarea value={selectedAgent.purpose} onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, purpose: event.target.value })} className="h-24 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                  <textarea value={selectedAgent.instructions} onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, instructions: event.target.value })} className="h-40 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
                  <input value={selectedAgent.tone} onChange={(event) => updateAgent(selectedAgentIndex, { ...selectedAgent, tone: event.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500" />
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
                  <button onClick={() => setDraft((current) => ({ ...current, agents: current.agents.filter((_, index) => index !== selectedAgentIndex) }))} className="w-full rounded-2xl border border-red-500/30 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-500/10 inline-flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Remove agent
                  </button>
                </>
              ) : (
                <div className="text-sm text-slate-500">Select an agent to edit its instructions and role.</div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Launch readiness</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Agents configured</span>
                <span className="font-bold">{draft.agents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Flow phases</span>
                <span className="font-bold">{draft.flow.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Est. run cost</span>
                <span className="font-bold">${(estimatedRunCost / 100).toFixed(2)}</span>
              </div>
              {draft.assumptions.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {draft.assumptions.length} assumption(s) still need review.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
