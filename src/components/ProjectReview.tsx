import React, { useState } from 'react';
import { 
  Users, 
  Settings2, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Play, 
  ArrowLeft, 
  ChevronRight, 
  Bot, 
  FileText, 
  Zap, 
  MessageSquare,
  Scale,
  ShieldCheck,
  Edit3,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  purpose: string;
  instructions: string;
  tone: string;
  tools: string[];
  capabilities: {
    ask: boolean;
    challenge: boolean;
    cite: boolean;
    score: boolean;
    recommend: boolean;
  };
}

interface ProjectReviewProps {
  prompt: string;
  onBack: () => void;
  onLaunch: (project: any) => void;
  assumptions?: string[];
}

const ProjectReview: React.FC<ProjectReviewProps> = ({ prompt, onBack, onLaunch, assumptions = [] }) => {
  const [title, setTitle] = useState("Avocado Consumption for Adults Over 40");
  const [objective, setObjective] = useState("Evaluate whether regular avocado consumption is beneficial, neutral, or risky for adults over 40.");
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'Dietician',
      role: 'Nutrition Specialist',
      purpose: 'Provide evidence-based dietary guidelines.',
      instructions: 'Focus on micronutrient profiles and long-term dietary patterns.',
      tone: 'Professional & Clinical',
      tools: ['NutritionDB', 'PubMed Search'],
      capabilities: { ask: true, challenge: true, cite: true, score: true, recommend: true }
    },
    {
      id: '2',
      name: 'Medical Doctor',
      role: 'General Practitioner',
      purpose: 'Assess overall health impacts and common comorbidities.',
      instructions: 'Consider patient history and typical age-related conditions.',
      tone: 'Empathetic & Practical',
      tools: ['Clinical Guidelines'],
      capabilities: { ask: true, challenge: true, cite: true, score: true, recommend: true }
    },
    {
      id: '3',
      name: 'Cardiologist',
      role: 'Heart Health Expert',
      purpose: 'Evaluate impact on lipid profiles and cardiovascular risk.',
      instructions: 'Focus on monounsaturated fats and heart health markers.',
      tone: 'Highly Technical',
      tools: ['AHA Guidelines'],
      capabilities: { ask: true, challenge: true, cite: true, score: true, recommend: true }
    },
    {
      id: '4',
      name: 'Research Skeptic',
      role: 'Critical Reviewer',
      purpose: 'Challenge assumptions and identify bias in nutrition studies.',
      instructions: 'Look for industry funding and small sample sizes in cited research.',
      tone: 'Analytical & Provocative',
      tools: ['Bias Scanner', 'Statistical Tool'],
      capabilities: { ask: true, challenge: true, cite: true, score: false, recommend: false }
    },
    {
      id: '5',
      name: 'Moderator',
      role: 'Final Synthesizer',
      purpose: 'Consolidate viewpoints into a final verdict.',
      instructions: 'Ensure all agents are heard and resolve conflicting evidence.',
      tone: 'Neutral & Balanced',
      tools: ['Synthesis Engine'],
      capabilities: { ask: true, challenge: false, cite: false, score: false, recommend: true }
    }
  ]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const flow = [
    { id: 1, name: "Opening Positions", description: "Agents state their initial stance based on expertise." },
    { id: 2, name: "Evidence and Claims", description: "Deep dive into data, studies, and clinical findings." },
    { id: 3, name: "Challenges and Rebuttals", description: "Agents cross-examine each other's evidence." },
    { id: 4, name: "Final Recommendations", description: "Agents provide their concluding advice." },
    { id: 5, name: "Synthesis", description: "Moderator produces the final executive summary." }
  ];

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-in slide-in-from-right duration-500">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider">Draft Setup</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Generated from: "{prompt}"</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
          <button 
            onClick={() => onLaunch({ title, objective, agents, flow })}
            className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            <Play className="w-4 h-4" />
            Launch Debate
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Agent Roster */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" />
              Agent Roster
            </h3>
            <button className="p-1.5 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                  selectedAgent?.id === agent.id 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900">{agent.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:text-indigo-600"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button className="p-1 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">{agent.purpose}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {agent.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Panel: Project Summary */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="max-w-3xl mx-auto space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Project Definition
                </h3>
                <button className="text-xs font-bold text-indigo-600 hover:underline">Edit Details</button>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Debate Title</label>
                  <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-2xl font-black text-slate-900 border-none p-0 focus:ring-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Objective</label>
                  <textarea 
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full text-slate-600 leading-relaxed border-none p-0 focus:ring-0 resize-none h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Interpreted Goal</span>
                    <p className="text-sm font-medium text-slate-700">Risk-Benefit Recommendation</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Output Type</span>
                    <p className="text-sm font-medium text-slate-700">Executive Verdict + Action Plan</p>
                  </div>
                </div>
              </div>
            </section>

            {assumptions.length > 0 && (
              <section className="space-y-4 animate-in fade-in slide-in-from-top duration-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Assumptions & Missing Context
                  </h3>
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded uppercase">Uncertainty Detected</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 space-y-4">
                  <p className="text-xs text-amber-800 font-medium leading-relaxed">
                    This project was generated using assumptions because some critical context was missing during intake. Review these carefully before launching.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {assumptions.map((assumption, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white/80 rounded-xl border border-amber-100 shadow-sm">
                        <div className="mt-0.5 p-1 bg-amber-100 rounded text-amber-600 shrink-0">
                          <HelpCircle className="w-3 h-3" />
                        </div>
                        <span className="text-xs text-slate-700 font-medium">{assumption}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full py-2 text-xs font-bold text-amber-700 hover:bg-amber-100/50 rounded-lg border border-dashed border-amber-200 transition-colors">
                    + Provide Missing Context to Refine Agents
                  </button>
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Suggested Flow
                </h3>
                <button className="text-xs font-bold text-indigo-600 hover:underline">Modify Flow</button>
              </div>
              <div className="space-y-2">
                {flow.map((phase, i) => (
                  <div key={phase.id} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors">
                      {i + 1}
                    </div>
                    <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm group-hover:border-indigo-100 transition-colors">
                      <h4 className="text-sm font-bold text-slate-900">{phase.name}</h4>
                      <p className="text-xs text-slate-500">{phase.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        {/* Right Panel: Agent Drawer (Conditional) */}
        {selectedAgent && (
          <aside className="w-96 border-l border-slate-200 bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Fine-Tune: {selectedAgent.name}</h3>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Agent Name</label>
                  <input className="w-full bg-slate-50 border-slate-200 rounded-lg text-sm px-3 py-2 font-medium" defaultValue={selectedAgent.name} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Role Title</label>
                  <input className="w-full bg-slate-50 border-slate-200 rounded-lg text-sm px-3 py-2" defaultValue={selectedAgent.role} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">System Instructions</label>
                  <textarea 
                    className="w-full bg-slate-50 border-slate-200 rounded-lg text-sm px-3 py-2 h-32 resize-none" 
                    defaultValue={selectedAgent.instructions}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tone / Stance</label>
                  <select className="w-full bg-slate-50 border-slate-200 rounded-lg text-sm px-3 py-2">
                    <option>{selectedAgent.tone}</option>
                    <option>Balanced</option>
                    <option>Adversarial</option>
                    <option>Supportive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capabilities</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { key: 'ask', label: 'Can ask questions', icon: MessageSquare },
                    { key: 'challenge', label: 'Can challenge others', icon: Scale },
                    { key: 'cite', label: 'Can cite evidence', icon: FileText },
                    { key: 'score', label: 'Can give scores', icon: Zap },
                    { key: 'recommend', label: 'Can produce final recommendation', icon: ShieldCheck },
                  ].map((cap) => (
                    <label key={cap.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <cap.icon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">{cap.label}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        defaultChecked={(selectedAgent.capabilities as any)[cap.key]} 
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" 
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Allowed Tools</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.tools.map((tool, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">
                      {tool}
                    </span>
                  ))}
                  <button className="px-2 py-1 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-bold border border-slate-200 hover:bg-slate-200 transition-colors">
                    + Add Tool
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setSelectedAgent(null)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ProjectReview;
