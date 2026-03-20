import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, PauseCircle, PlayCircle, Square, Zap } from 'lucide-react';

import { createRunEventsSource, getRun, getRunResult, getTranscript, stopRun } from './api';
import type { FinalOutputResponse, ProjectResponse, RunResponse, TranscriptMessageResponse } from './types';

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
          </div>
        </div>
      </div>
    </div>
  );
}
