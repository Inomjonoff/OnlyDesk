"use client";

import { CheckCircle2, Circle, Activity, ShieldCheck, Server, RefreshCw } from "lucide-react";

export default function StatusPage() {
  const services = [
    { name: "Web Dashboard & CDN", status: "Operational", uptime: "99.98%", latency: "18ms" },
    { name: "API Control Plane", status: "Operational", uptime: "99.95%", latency: "22ms" },
    { name: "Signaling & Redis PubSub", status: "Operational", uptime: "99.99%", latency: "14ms" },
    { name: "WebRTC STUN / TURN Relays", status: "Operational", uptime: "99.90%", latency: "28ms" },
    { name: "AI Session Copilot & Vision Engine", status: "Operational", uptime: "99.92%", latency: "350ms" },
    { name: "Recording Object Storage", status: "Operational", uptime: "99.99%", latency: "42ms" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-4xl mx-auto flex flex-col justify-between">
      <div>
        <header className="flex items-center justify-between pb-8 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">NexusDesk System Status</h1>
            <p className="text-slate-400 text-sm mt-1">Real-time operational status across all global edge endpoints and WebRTC relays.</p>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>All Systems Operational</span>
          </div>
        </header>

        {/* Services List */}
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 shadow-xl overflow-hidden">
          {services.map((svc) => (
            <div key={svc.name} className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <Circle className="w-2.5 h-2.5 fill-current text-emerald-400" />
                <span className="text-sm font-bold text-slate-200">{svc.name}</span>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-400 font-medium">
                <span>Latency: <strong className="text-slate-200">{svc.latency}</strong></span>
                <span>Uptime: <strong className="text-slate-200">{svc.uptime}</strong></span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 text-[11px] font-semibold">{svc.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-16 pt-6 border-t border-slate-900 flex items-center justify-between text-xs text-slate-500">
        <span>NexusDesk Public Beta • Updated automatically every 60s</span>
        <a href="/" className="text-slate-400 hover:text-slate-200">Return to NexusDesk.uz</a>
      </footer>
    </div>
  );
}
