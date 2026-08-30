import { useState } from "react";
import { Activity, Monitor, ShieldCheck, Bot, Layers, Server } from "lucide-react";

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState<"overview" | "devices" | "sessions" | "audit" | "ai">(
    "overview",
  );

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/30">
              N
            </div>
            <div>
              <div className="font-bold text-sm text-white">NexusDesk Admin</div>
              <div className="text-[10px] text-slate-400">Enterprise Control Plane</div>
            </div>
          </div>

          <nav className="space-y-1 text-sm font-medium">
            {[
              { id: "overview", label: "System Overview", icon: Activity },
              { id: "devices", label: "Device Fleet", icon: Monitor },
              { id: "sessions", label: "Active Sessions", icon: Layers },
              { id: "ai", label: "AI Usage & Telemetry", icon: Bot },
              { id: "audit", label: "Security Audit Logs", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-medium ${
                    activeTab === item.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <Server className="w-3.5 h-3.5" /> All Clusters Healthy
          </div>
          <div>Fastify + Redis PubSub</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-white capitalize">{activeTab}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time status of distributed NexusDesk infrastructure
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              API & Signaling Online
            </span>
          </div>
        </header>

        {/* Dashboard View */}
        {activeTab === "overview" && (
          <div className="mt-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Sessions
                </div>
                <div className="text-2xl font-bold text-white mt-2">18</div>
                <div className="text-xs text-emerald-400 mt-1 font-medium">
                  94% Direct P2P WebRTC
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Registered Devices
                </div>
                <div className="text-2xl font-bold text-blue-400 mt-2">1,248</div>
                <div className="text-xs text-slate-400 mt-1 font-medium">412 Online right now</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AI Diagnostic Calls
                </div>
                <div className="text-2xl font-bold text-purple-400 mt-2">892</div>
                <div className="text-xs text-purple-300 mt-1 font-medium">Avg Latency: 420ms</div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Average RTT
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-2">26 ms</div>
                <div className="text-xs text-emerald-300 mt-1 font-medium">
                  Packet loss &lt; 0.1%
                </div>
              </div>
            </div>

            {/* Live Session Table */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-white mb-4">Active Remote Sessions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="pb-3">Session ID</th>
                      <th className="pb-3">Host Device</th>
                      <th className="pb-3">Viewer Device</th>
                      <th className="pb-3">Transport</th>
                      <th className="pb-3">Quality</th>
                      <th className="pb-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[
                      {
                        id: "ses_8f9a2b1c",
                        host: "NXD-W9A2-K7L4 (Windows)",
                        viewer: "NXD-M3P1-X9Y2 (macOS)",
                        type: "P2P WebRTC",
                        quality: "24ms / 60fps",
                        dur: "14m 20s",
                      },
                      {
                        id: "ses_3d4e5f6a",
                        host: "NXD-L8N4-Q2R7 (Linux)",
                        viewer: "NXD-W1A9-B2C3 (Windows)",
                        type: "TURN Relay",
                        quality: "48ms / 30fps",
                        dur: "04m 12s",
                      },
                    ].map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 font-mono text-blue-400">{s.id}</td>
                        <td className="py-3">{s.host}</td>
                        <td className="py-3">{s.viewer}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800">
                            {s.type}
                          </span>
                        </td>
                        <td className="py-3 text-emerald-400">{s.quality}</td>
                        <td className="py-3 text-slate-400">{s.dur}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="mt-6 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-4">
              Security Audit Stream (Append-Only)
            </h3>
            <div className="space-y-3 font-mono text-xs">
              {[
                {
                  time: "2026-08-30 01:05:12",
                  event: "session.approved",
                  user: "admin@nexusdesk.ai",
                  target: "NXD-W9A2-K7L4",
                  perms: "SCREEN_VIEW, MOUSE_CONTROL",
                },
                {
                  time: "2026-08-30 01:04:40",
                  event: "auth.login",
                  user: "operator@nexusdesk.ai",
                  target: "127.0.0.1",
                  perms: "2FA_VERIFIED",
                },
                {
                  time: "2026-08-30 01:02:18",
                  event: "ai.analysis.completed",
                  user: "system",
                  target: "ses_8f9a2b1c",
                  perms: "DIAGNOSTICS_SANITIZED",
                },
              ].map((log, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{log.time}</span>
                    <span className="px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                      {log.event}
                    </span>
                    <span className="text-slate-300">{log.user}</span>
                  </div>
                  <div className="text-slate-400">{log.perms}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
