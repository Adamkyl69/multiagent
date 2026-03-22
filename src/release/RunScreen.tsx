import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookmarkPlus, Check, Loader2, PauseCircle, PlayCircle, Square, Star, X, Zap } from 'lucide-react';

import { createRunEventsSource, getRun, getRunResult, getTranscript, saveAgentAsTemplate, stopRun } from './api';
import type { ExpertTemplateResponse, FinalOutputResponse, ProjectResponse, RunResponse, TranscriptMessageResponse } from './types';

const DECISION_DOMAINS = [
  'pricing', 'hiring', 'product', 'market_expansion', 'health',
  'investment', 'operations', 'strategy', 'technology', 'legal',
  'marketing', 'partnerships', 'organizational', 'personal',
];

interface RunScreenProps {
  token: string;
  project: ProjectResponse;
  initialRun: RunResponse;
  onBack: () => void;
}

function upsertMessages(current: TranscriptMessageResponse[], next: TranscriptMessageResponse[]): TranscriptMessageResponse[] {
  const bySequence = new Map<number, TranscriptMessageResponse>();
  [...current, ...next].forEach((item) => bySequence.set(item.sequence, item));
  return Array.from(bySequence.values()).sort((left, right) => left.sequence - right.sequence);
}

export default function RunScreen({ token, project, initialRun, onBack }: RunScreenProps) {
  const [run, setRun] = useState<RunResponse>(initialRun);
  const [messages, setMessages] = useState<TranscriptMessageResponse[]>([]);
  const [result, setResult] = useState<FinalOutputResponse | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('Queued');
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState<number | null>(null);
  const [saveDomains, setSaveDomains] = useState<string[]>([]);
  const [saveNote, setSaveNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<ExpertTemplateResponse[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const [runState, transcript] = await Promise.all([
          getRun(token, initialRun.run_id),
          getTranscript(token, initialRun.run_id),
        ]);
        if (cancelled) {
          return;
        }
        setRun(runState);
        setMessages(transcript);
        if (runState.status === 'completed') {
          const finalResult = await getRunResult(token, initialRun.run_id);
          if (!cancelled) {
            setResult(finalResult);
          }
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to load run state.');
        }
      }
    }

    bootstrap();

    const source = createRunEventsSource(token, initialRun.run_id);
    eventSourceRef.current = source;
    source.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          event_type: string;
          payload: Record<string, unknown>;
        };
        if (payload.event_type === 'phase.started') {
          setCurrentPhase(String(payload.payload.phase ?? 'Running'));
        }
        if (payload.event_type === 'message.created') {
          setMessages((current) =>
            upsertMessages(current, [
              {
                id: `${payload.payload.sequence ?? Date.now()}`,
                phase_name: String(payload.payload.phase ?? currentPhase),
                speaker_name: String(payload.payload.speaker ?? 'Agent'),
                message_type: String(payload.payload.message_type ?? 'statement'),
                content: String(payload.payload.content ?? ''),
                sequence: Number(payload.payload.sequence ?? current.length + 1),
                created_at: new Date().toISOString(),
              },
            ]),
          );
        }
        if (payload.event_type === 'run.completed') {
          const [runState, finalResult] = await Promise.all([
            getRun(token, initialRun.run_id),
            getRunResult(token, initialRun.run_id),
          ]);
          setRun(runState);
          setResult(finalResult);
          source.close();
        }
        if (payload.event_type === 'run.failed' || payload.event_type === 'run.canceled') {
          const runState = await getRun(token, initialRun.run_id);
          setRun(runState);
          if (payload.event_type === 'run.failed') {
            setError(String(payload.payload.error ?? 'Run failed.'));
          }
          source.close();
        }
      } catch {
        setError('Unable to process streamed run event.');
      }
    };
    source.onerror = () => {
      source.close();
    };

    return () => {
      cancelled = true;
      source.close();
      eventSourceRef.current = null;
    };
  }, [currentPhase, initialRun.run_id, token]);

  async function handleStop() {
    setStopping(true);
    setError(null);
    try {
      const stopped = await stopRun(token, run.run_id);
      setRun(stopped);
      eventSourceRef.current?.close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to stop run.');
    } finally {
      setStopping(false);
    }
  }

  const participantNames = useMemo(() => project.agents.map((agent) => agent.name), [project.agents]);

  async function handleSaveAgent() {
    if (selectedAgentIndex === null || saveDomains.length === 0 || saveNote.length < 10) return;
    setSaving(true);
    setSaveError(null);
    try {
      const template = await saveAgentAsTemplate(token, run.run_id, {
        agent_index: selectedAgentIndex,
        decision_domains: saveDomains,
        performance_note: saveNote,
      });
      setSavedTemplates((prev) => [...prev, template]);
      setSelectedAgentIndex(null);
      setSaveDomains([]);
      setSaveNote('');
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  }

  function toggleDomain(domain: string) {
    setSaveDomains((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : prev.length < 3
          ? [...prev, domain]
          : prev,
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold hover:border-indigo-500 inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to project
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight">{project.title}</h1>
              <p className="text-sm text-slate-400 mt-1">Run status: {run.status} · Current phase: {currentPhase}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 inline-flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-300" />
              ${(run.actual_cost_cents / 100).toFixed(2)} actual / ${(run.estimated_cost_cents / 100).toFixed(2)} est.
            </div>
            <button onClick={handleStop} disabled={stopping || run.status !== 'running'} className="rounded-2xl border border-red-500/30 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-500/10 inline-flex items-center gap-2 disabled:opacity-50">
              {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              Stop run
            </button>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[0.7fr_1.4fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Participants</h2>
            <div className="mt-5 space-y-3">
              {participantNames.map((name) => (
                <div key={name} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <div className="text-sm font-bold">{name}</div>
                  <div className="text-xs text-slate-500 mt-1">{project.agents.find((agent) => agent.name === name)?.role}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Live transcript</h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
                {run.status === 'running' ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                {run.status}
              </div>
            </div>
            <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-8 text-sm text-slate-500 text-center">
                  Waiting for the first streamed debate turn.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={`${message.sequence}-${message.id}`} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-white">{message.speaker_name}</div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mt-1">{message.phase_name}</div>
                      </div>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{message.message_type}</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-200">{message.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Run summary</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="font-bold text-white">{run.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Created</span>
                  <span>{new Date(run.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Messages</span>
                  <span>{messages.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Final synthesis</h2>
              {result ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Summary</div>
                    <p className="mt-2 text-sm leading-7 text-slate-200">{result.summary}</p>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Verdict</div>
                    <p className="mt-2 text-sm leading-7 text-slate-200">{result.verdict}</p>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Recommendations</div>
                    <ul className="mt-2 space-y-2 text-sm text-slate-200">
                      {result.recommendations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-500">
                  Final synthesis will appear here as soon as the run completes.
                </div>
              )}
            </div>

            {/* Save Expert Perspectives - only after completed debate */}
            {run.status === 'completed' && result && (
              <div className="rounded-3xl border border-indigo-500/20 bg-slate-900/80 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    Save expert perspectives
                  </h2>
                  {!showSavePanel && (
                    <button
                      onClick={() => setShowSavePanel(true)}
                      className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20 inline-flex items-center gap-1.5"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      Save agents
                    </button>
                  )}
                </div>

                {savedTemplates.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {savedTemplates.map((t) => (
                      <div key={t.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5" />
                        <span className="font-bold">{t.name}</span> saved as expert template
                      </div>
                    ))}
                  </div>
                )}

                {showSavePanel && (
                  <div className="mt-5 space-y-4">
                    <p className="text-xs text-slate-400">Which agents provided the most valuable insights? Save them as expert templates for future decisions.</p>

                    {/* Agent selection */}
                    <div className="space-y-2">
                      {project.agents.map((agent, idx) => {
                        const alreadySaved = savedTemplates.some((t) => t.name === agent.name);
                        return (
                          <button
                            key={agent.name}
                            disabled={alreadySaved}
                            onClick={() => setSelectedAgentIndex(selectedAgentIndex === idx ? null : idx)}
                            className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                              alreadySaved
                                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300 opacity-60 cursor-not-allowed'
                                : selectedAgentIndex === idx
                                  ? 'border-indigo-500/40 bg-indigo-500/10 text-white'
                                  : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="font-bold text-xs">{agent.name}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{agent.role}</div>
                            {alreadySaved && <div className="text-[10px] text-emerald-400 mt-1">Saved</div>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Save form for selected agent */}
                    {selectedAgentIndex !== null && (
                      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
                        <div className="text-xs font-bold text-slate-300">
                          Saving: {project.agents[selectedAgentIndex]?.name}
                        </div>

                        {/* Domain tags */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">Decision domains (1-3)</div>
                          <div className="flex flex-wrap gap-1.5">
                            {DECISION_DOMAINS.map((d) => (
                              <button
                                key={d}
                                onClick={() => toggleDomain(d)}
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold border transition-colors ${
                                  saveDomains.includes(d)
                                    ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-200'
                                    : 'border-slate-700 text-slate-500 hover:border-slate-600'
                                }`}
                              >
                                {d.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Performance note */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">Why was this agent valuable? (min 10 chars)</div>
                          <textarea
                            value={saveNote}
                            onChange={(e) => setSaveNote(e.target.value)}
                            placeholder="e.g., Strong at identifying hidden risks in pricing decisions..."
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/40 resize-none"
                            rows={2}
                          />
                        </div>

                        {saveError && (
                          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{saveError}</div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveAgent}
                            disabled={saving || saveDomains.length === 0 || saveNote.length < 10}
                            className="rounded-xl border border-indigo-500/40 bg-indigo-500/20 px-4 py-2 text-xs font-bold text-indigo-100 hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                            Save as template
                          </button>
                          <button
                            onClick={() => { setSelectedAgentIndex(null); setSaveDomains([]); setSaveNote(''); setSaveError(null); }}
                            className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-slate-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!selectedAgentIndex && selectedAgentIndex !== 0 && (
                      <p className="text-[11px] text-slate-500 italic">Select an agent above to save it as a reusable expert template.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
