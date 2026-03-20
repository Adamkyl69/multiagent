import React from 'react';
import { 
  BarChart3, 
  CheckCircle, 
  Download, 
  Share2, 
  ClipboardList, 
  FileText, 
  ChevronDown,
  AlertCircle,
  HelpCircle,
  Scale,
  UserCheck,
  ArrowRight
} from 'lucide-react';

const ExecutiveReport = () => {
  return (
    <div className="flex-1 flex justify-center py-8 px-4 md:px-0 animate-in fade-in slide-in-from-bottom duration-700">
      <div className="max-w-4xl w-full flex flex-col gap-8">
        {/* Final Verdict Banner */}
        <section className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="bg-emerald-500 px-6 py-2 flex justify-between items-center">
            <span className="text-white text-xs font-bold uppercase tracking-widest">System Status: Completed</span>
            <span className="text-emerald-50 text-xs font-medium">Run #4421 • May 24, 2024</span>
          </div>
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Final Verdict</h1>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 text-4xl font-black">APPROVED</span>
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <p className="mt-4 text-slate-700 text-lg leading-relaxed">
                  The Project Alpha proposal meets all core compliance and financial benchmarks. Strategic alignment is confirmed with high confidence for immediate execution.
                </p>
              </div>
              <div className="w-full md:w-48 flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <span className="text-slate-500 text-sm font-medium">Confidence</span>
                  <span className="text-emerald-600 text-2xl font-bold">85%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Critical Accountability Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-indigo-600">
              <HelpCircle className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Assumptions</h4>
            </div>
            <ul className="space-y-3">
              {[
                "Market growth remains > 5% YoY",
                "EMEA regulatory framework stable",
                "Internal resource availability Q3"
              ].map((text, i) => (
                <li key={i} className="text-sm text-slate-600 flex gap-2">
                  <span className="text-indigo-300 font-bold">•</span> {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Unresolved Issues</h4>
            </div>
            <ul className="space-y-3">
              {[
                "Pending final tax audit (Luxembourg)",
                "Clause 4.2 IP ownership ambiguity",
                "Tier-2 city infrastructure costs"
              ].map((text, i) => (
                <li key={i} className="text-sm text-slate-600 flex gap-2">
                  <span className="text-amber-300 font-bold">•</span> {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-red-600">
              <Scale className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Conflicting Opinions</h4>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Legal vs CFO</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Disagreement on contingency buffer (12% vs 20%) for GDPR compliance.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">PM vs Analyst</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Conflict on timeline feasibility for tier-2 city rollout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Specialist Scorecards */}
        <section>
          <h3 className="text-slate-900 text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Specialist Scorecards
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "CFO Office", role: "Financial Audit", score: 9, desc: "ROI projections exceed the 15% hurdle rate. Cash flow impact is minimal within current fiscal quarter.", risk: "Exchange rate volatility", riskColor: "bg-amber-500" },
              { title: "Legal/Risk", role: "Compliance", score: 7, desc: "Contractual terms align with standard MSA. Minor IP clarifications required for Phase 2.", risks: ["GDPR Data Residency", "Clause 4.2 Ambiguity"], riskColors: ["bg-red-500", "bg-amber-500"] },
              { title: "Project Mgmt", role: "Operations", score: 8, desc: "Timeline is aggressive but achievable given existing resource allocation and buffer.", risk: "Resource availability Q3", riskColor: "bg-amber-500" }
            ].map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900">{card.title}</h4>
                    <p className="text-xs text-slate-500 uppercase">{card.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xl">{card.score}</div>
                </div>
                <p className="text-sm text-slate-600 mb-4 line-clamp-3">{card.desc}</p>
                <div className="mt-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">Identified Risks</p>
                  <ul className="space-y-1">
                    {card.risks ? card.risks.map((r, j) => (
                      <li key={j} className="flex items-center gap-2 text-xs text-slate-700">
                        <span className={`w-1.5 h-1.5 rounded-full ${card.riskColors[j]}`}></span> {r}
                      </li>
                    )) : (
                      <li className="flex items-center gap-2 text-xs text-slate-700">
                        <span className={`w-1.5 h-1.5 rounded-full ${card.riskColor}`}></span> {card.risk}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Human Review Required */}
        <section className="bg-indigo-900 rounded-xl shadow-lg p-8 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <UserCheck className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <UserCheck className="w-6 h-6 text-indigo-300" />
              <h3 className="text-xl font-bold">Human Review Required</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-indigo-100 text-sm leading-relaxed">
                  The AI has identified 2 edge cases that fall outside standard operating parameters. Executive override or clarification is required before final execution.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/10">
                    <AlertCircle className="w-5 h-5 text-indigo-300" />
                    <span className="text-sm font-medium">Strategic Pivot: Tier-2 vs Tier-1 Priority</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg border border-white/10">
                    <AlertCircle className="w-5 h-5 text-indigo-300" />
                    <span className="text-sm font-medium">Budget Reallocation: Q4 Buffer Usage</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4">
                <button className="bg-white text-indigo-900 font-bold py-3 px-6 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors">
                  Open Review Workspace <ArrowRight className="w-4 h-4" />
                </button>
                <button className="bg-transparent border border-white/30 text-white font-bold py-3 px-6 rounded-lg text-sm hover:bg-white/5 transition-colors">
                  Delegate to Specialist
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Action Plan */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-slate-900 text-xl font-bold mb-6 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Immediate Action Plan
          </h3>
          <div className="space-y-4">
            {[
              { title: "Finalize IP Clause 4.2 with vendor", desc: "Legal team to send redlines by EOD Tuesday.", checked: true },
              { title: "Initiate Q3 resource booking", desc: "PMO to lock in key engineering leads for Phase 1 start.", checked: false },
              { title: "Board Approval Signature", desc: "Final executive sign-off required for budget release.", checked: false }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="mt-0.5">
                  <input type="checkbox" defaultChecked={item.checked} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                </div>
                <div>
                  <p className="text-slate-900 font-semibold">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transcript Section */}
        <section className="border-t border-slate-200 pt-8 pb-12">
          <button className="w-full flex items-center justify-between group py-4 px-2 hover:bg-slate-50 rounded-lg transition-all">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <span className="text-slate-900 font-bold">Full Run Transcript</span>
              <span className="bg-slate-100 text-[10px] px-2 py-0.5 rounded font-mono text-slate-500 uppercase">2,450 tokens</span>
            </div>
            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-transform" />
          </button>
          
          <div className="mt-6 p-6 bg-slate-950 rounded-xl font-mono text-xs text-emerald-500/80 leading-relaxed overflow-hidden max-h-60 relative border border-slate-800">
            <div className="space-y-2">
              <p>[2024-05-24 14:02:11] INITIALIZING RUN #4421...</p>
              <p>[2024-05-24 14:02:12] LOADING DOCUMENT: project_alpha_proposal_v4.pdf</p>
              <p>[2024-05-24 14:02:15] AGENT [CFO] STARTING ANALYSIS...</p>
              <p>[2024-05-24 14:02:18] AGENT [LEGAL] STARTING COMPLIANCE SCAN...</p>
              <p>[2024-05-24 14:02:45] CFO: "Projections match historical benchmarks. CAPEX within limits."</p>
              <p>[2024-05-24 14:03:02] LEGAL: "Identified conflict in section 4.2. Flagging for human review."</p>
              <p>[2024-05-24 14:03:15] PM: "Resource conflict detected in Q3. Mitigation possible via contractor pool."</p>
              <p>[2024-05-24 14:03:45] CONSOLIDATING VERDICT...</p>
              <p>[2024-05-24 14:04:00] FINAL SCORE: 8.5/10. STATUS: APPROVED.</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent flex items-end justify-center pb-4">
              <button className="text-[10px] font-bold tracking-widest uppercase text-slate-500 hover:text-white">View Full Logs</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ExecutiveReport;
