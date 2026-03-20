import React from 'react';
import { 
  Bot, 
  BadgeCheck, 
  Terminal, 
  Construction, 
  Save, 
  X, 
  AlertTriangle, 
  Search, 
  Settings, 
  Bell, 
  User, 
  Plus, 
  LayoutDashboard, 
  Workflow, 
  TerminalSquare, 
  BarChart3, 
  Wallet, 
  Gavel, 
  ClipboardList, 
  TrendingUp, 
  Rocket,
  ShieldCheck,
  MessageSquare,
  Target,
  Eye,
  Zap,
  Network,
  Code2
} from 'lucide-react';

const AgentBuilder = () => {
  return (
    <div className="flex h-full overflow-hidden animate-in slide-in-from-right duration-500">
      {/* Left Panel: Agent List */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900">Active Agents</h3>
            <p className="text-xs text-slate-500">4 total roles configured</p>
          </div>
          <button className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100 cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">CFO</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-xs text-slate-500">Financial Analysis</p>
            </div>
          </div>
          
          {[
            { name: "Legal Counsel", role: "Compliance & Risk", icon: <Gavel className="w-5 h-5" /> },
            { name: "Product Manager", role: "Roadmap & Specs", icon: <ClipboardList className="w-5 h-5" />, active: true },
            { name: "CEO", role: "Strategy & Vision", icon: <TrendingUp className="w-5 h-5" />, active: true }
          ].map((agent, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                {agent.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">{agent.name}</span>
                  {agent.active && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                </div>
                <p className="text-xs text-slate-500">{agent.role}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-50">
          <button className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Save Agent Configuration
          </button>
        </div>
      </aside>

      {/* Right Panel: Edit Form */}
      <section className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1 uppercase tracking-wider">
                <Settings className="w-4 h-4" />
                Configuration
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Edit Agent: CFO</h1>
              <p className="text-slate-500 mt-1 text-sm italic">Define behavioral logic, tool access, and participation rules for the financial role.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-medium text-sm hover:bg-white transition-colors">Cancel</button>
              <button className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-600/20 transition-all">Publish Agent Set</button>
            </div>
          </div>

          {/* Identity & Persona */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Identity & Persona
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Name</label>
                <input className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 text-sm focus:ring-indigo-600 focus:border-indigo-600" type="text" defaultValue="CFO Agent v2" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Role Title</label>
                <input className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 text-sm focus:ring-indigo-600 focus:border-indigo-600" type="text" defaultValue="Chief Financial Officer" />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="block text-sm font-semibold text-slate-700">Short Description</label>
                <input className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 text-sm focus:ring-indigo-600 focus:border-indigo-600" placeholder="e.g. Expert in ROI analysis and budget optimization" type="text" />
              </div>
            </div>
          </div>

          {/* Board Participation Rules */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Board Participation Rules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Allowed Phases</label>
                  <div className="flex flex-wrap gap-2">
                    {['Initial Brief', 'Specialist Analysis', 'Cross-Examination', 'Final Verdict'].map(phase => (
                      <span key={phase} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded border border-indigo-100 flex items-center gap-1">
                        {phase} <X className="w-2 h-2 cursor-pointer" />
                      </span>
                    ))}
                    <button className="px-2 py-1 border border-dashed border-slate-300 text-slate-400 text-[10px] font-bold rounded hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                      + Add Phase
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-700 font-medium">Can initiate questions</span>
                    </div>
                    <div className="w-9 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-700 font-medium">Can score proposals</span>
                    </div>
                    <div className="w-9 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-700 font-medium">Requires Final View</span>
                    </div>
                    <div className="w-9 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm text-slate-700 font-medium">Speak only after trigger</span>
                    </div>
                    <div className="w-9 h-5 bg-slate-200 rounded-full relative cursor-pointer">
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Relationship Logic</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500">Can ask whom?</span>
                      <span className="font-bold text-slate-700">All Participants</span>
                    </div>
                    <div className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="text-slate-500">Can challenge whom?</span>
                      <span className="font-bold text-slate-700">Legal, CEO</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Instructions & Output Schema */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm md:col-span-2">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600" />
                System Instructions
              </h3>
              <textarea 
                className="w-full h-64 rounded-lg border-slate-200 bg-slate-50 p-4 text-sm focus:ring-indigo-600 focus:border-indigo-600 font-mono leading-relaxed" 
                placeholder="Enter instructions for the agent's core logic..."
                defaultValue={`You are the CFO Agent. Your primary objective is to evaluate all proposals through the lens of financial viability, ROI, and risk management.

1. Always request specific budget breakdowns.
2. Flag any ROI projections that lack historical backing.
3. In the 'Cross-Examination' phase, specifically challenge the Marketing agent on CAC estimates.`}
              />
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600" />
                Output Schema
              </h3>
              <div className="flex-1 bg-slate-900 rounded-lg p-4 font-mono text-[10px] text-emerald-400 overflow-hidden">
                <pre className="whitespace-pre-wrap">
{`{
  "verdict": "string",
  "confidence": "number",
  "financial_risk": {
    "score": "number",
    "reason": "string"
  },
  "roi_projection": "number",
  "required_budget": "number"
}`}
                </pre>
              </div>
              <button className="mt-4 w-full py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Edit Schema
              </button>
            </div>
          </div>

          {/* Tool Access */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Construction className="w-4 h-4 text-indigo-600" />
              Tool Access
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: "Web Research", desc: "Real-time market data", checked: true },
                { name: "Financial Engine", desc: "Advanced modeling", checked: true },
                { name: "Code Interpreter", desc: "Python data viz", checked: false },
                { name: "ERP Connector", desc: "Internal ledger access", checked: true },
                { name: "Risk DB", desc: "Historical risk data", checked: true }
              ].map((tool, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input type="checkbox" defaultChecked={tool.checked} className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-600" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{tool.name}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{tool.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Last modified: Oct 24, 2023 · v2.4.1</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AgentBuilder;
