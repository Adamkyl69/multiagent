import React from 'react';
import { 
  Search, 
  Rocket, 
  Bell, 
  Inbox, 
  Group, 
  Verified, 
  Plus, 
  History, 
  PlayCircle, 
  Eye, 
  Kanban, 
  Variable, 
  Bolt, 
  Bot, 
  Scale, 
  GripVertical, 
  LogOut, 
  FileText, 
  X, 
  HelpCircle,
  Users,
  CheckSquare,
  LogIn,
  AlertCircle,
  Info,
  ShieldAlert,
  ChevronRight,
  Save
} from 'lucide-react';

const FlowBuilder = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-500">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-1.5 bg-indigo-600 rounded text-white">
            <Kanban className="w-6 h-6" />
          </div>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">Flow Builder</h2>
          <div className="h-4 w-px bg-slate-200 mx-2"></div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-sm font-semibold">Legal Opinion Workflow</h1>
            <p className="text-slate-500 text-xs font-normal">v2.4.0 • Draft</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <a href="#" className="text-slate-600 text-sm font-medium hover:text-indigo-600 transition-colors">Workspace</a>
            <a href="#" className="text-slate-600 text-sm font-medium hover:text-indigo-600 transition-colors">Agents</a>
            <a href="#" className="text-indigo-600 text-sm font-semibold border-b-2 border-indigo-600 pb-1">Flow Designer</a>
          </nav>
          <div className="flex items-center gap-3 ml-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">
              <Rocket className="w-4 h-4" />
              Publish Flow
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-indigo-600 transition-all" placeholder="Search nodes..." type="text" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Core Elements</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50 text-indigo-600 cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100">
                  <Kanban className="w-5 h-5" />
                  <p className="text-sm font-semibold">Phases</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">
                  <Variable className="w-5 h-5" />
                  <p className="text-sm font-medium">Variables</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors">
                  <Bolt className="w-5 h-5" />
                  <p className="text-sm font-medium">Triggers</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Agents</h3>
              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 cursor-grab active:cursor-grabbing">
                  <div className="flex items-center gap-2 mb-1">
                    <Inbox className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold">CFO Agent</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Financial risk scoring</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 cursor-grab active:cursor-grabbing">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold">Legal Evaluator</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Compliance & risk scoring</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <button className="w-full py-2 flex items-center justify-center gap-2 text-indigo-600 font-bold text-sm border-2 border-indigo-600/20 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
              <Plus className="w-4 h-4" />
              New Agent
            </button>
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* Live Explanation Line */}
          <div className="bg-indigo-600 text-white px-6 py-2 flex items-center gap-3 text-xs font-medium shadow-lg z-10">
            <Info className="w-4 h-4 text-indigo-200" />
            <span>
              In this phase, <span className="font-bold underline">Legal</span>, <span className="font-bold underline">CFO</span>, and <span className="font-bold underline">Marketer</span> may speak. CEO is blocked. Phase ends when all required agents submit Final View or max 12 turns is reached.
            </span>
          </div>

          <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              <button className="px-4 py-1.5 text-sm font-bold bg-white rounded shadow-sm text-indigo-600">Visual Flow</button>
              <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Rule Editor</button>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors">
                <History className="w-4 h-4" />
                Changes
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors">
                <PlayCircle className="w-4 h-4" />
                Preview
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-auto p-12">
            <div className="flex items-center gap-0">
              <div className="flex flex-col items-center">
                <div className="w-56 bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm hover:border-indigo-600 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                      <Inbox className="w-5 h-5 text-indigo-600" />
                    </div>
                    <History className="w-4 h-4 text-slate-300" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Intake</h4>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Agents</span>
                      <span className="font-semibold">1</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-12 h-0.5 bg-slate-200 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>

              <div className="flex flex-col items-center relative">
                <div className="w-56 bg-white rounded-xl border-2 border-indigo-600 p-5 shadow-xl shadow-indigo-600/5 ring-4 ring-indigo-600/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    <History className="w-4 h-4 text-slate-300" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Specialist Analysis</h4>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs text-indigo-600 font-bold">
                      <span>Agents</span>
                      <span>3</span>
                    </div>
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">ACTIVE CONFIG</div>
                </div>
              </div>

              <div className="w-12 h-0.5 bg-slate-200 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-56 bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm hover:border-indigo-600 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                      <Group className="w-5 h-5 text-indigo-600" />
                    </div>
                    <History className="w-4 h-4 text-slate-300" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Cross-Question</h4>
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Agents</span>
                      <span className="font-semibold">4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="w-[450px] border-l border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Phase Configuration</h2>
              <p className="text-xs text-slate-500 font-medium">Specialist Analysis • ID: PH-002</p>
            </div>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Participants Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants
              </h3>
              <div className="space-y-2">
                {[
                  { name: 'Legal Evaluator', role: 'Required', status: 'Active' },
                  { name: 'CFO Agent', role: 'Required', status: 'Active' },
                  { name: 'Marketing Analyst', role: 'Optional', status: 'Active' },
                  { name: 'CEO', role: 'Blocked', status: 'Inactive' }
                ].map((p, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${p.role === 'Blocked' ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${p.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-bold text-slate-700">{p.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.role === 'Required' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      {p.role.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Required Outputs Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Required Outputs
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {['Risk Score', 'ROI Estimate', 'Compliance Check', 'Competitor Map'].map(output => (
                  <label key={output} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                    <span className="text-xs font-bold text-slate-700">{output}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Rules Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Bolt className="w-4 h-4" />
                Execution Rules
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <LogIn className="w-4 h-4" />
                    <span className="text-xs font-bold">Entry Rule</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Triggered when <span className="font-bold">Intake Phase</span> completes with a valid <span className="font-bold">Briefing Document</span>.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <LogOut className="w-4 h-4" />
                    <span className="text-xs font-bold">Exit Rule</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Phase ends when <span className="font-bold">Consensus &gt; 80%</span> OR <span className="font-bold">Max Turns (12)</span> reached.
                  </p>
                </div>

                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs font-bold">Failure Rule</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    If no consensus after 12 turns, <span className="font-bold">Escalate to Human Review</span> and flag as "Stalled".
                  </p>
                </div>
              </div>
            </section>

            {/* Selection Explanation Preview */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Selection Explanation Preview
              </h3>
              <div className="p-4 bg-slate-900 rounded-xl font-mono text-[10px] text-indigo-300 leading-relaxed">
                <p>"Next speaker is <span className="text-white">Legal Evaluator</span> because the previous turn from <span className="text-white">CFO</span> introduced a new regulatory risk variable that requires immediate compliance validation per Rule 4.2."</p>
              </div>
            </section>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button className="flex-1 py-3 text-sm font-bold bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </aside>
      </div>
      
      <footer className="h-8 bg-slate-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">System Online</span>
          </div>
          <div className="h-3 w-px bg-slate-700"></div>
          <span className="text-[10px] text-slate-500">Latency: 124ms</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
          <span>CPU: 12%</span>
          <span>MEM: 2.4GB</span>
          <HelpCircle className="w-3 h-3" />
        </div>
      </footer>
    </div>
  );
};

export default FlowBuilder;
