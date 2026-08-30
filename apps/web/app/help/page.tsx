"use client";

import { useState } from "react";
import { HelpCircle, Terminal, Download, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function HelpPage() {
  const [selectedIssue, setSelectedIssue] = useState<string | null>("connection");
  const [copiedBundle, setCopiedBundle] = useState(false);

  const diagnosticBundle = JSON.stringify(
    {
      appVersion: "1.0.0-beta.1",
      platform: "Windows 11 x64 (Build 22631)",
      webrtcState: "ICE_CONNECTED",
      turnRelay: "turn.nexusdesk.uz:3478 (UDP)",
      roundTripTimeMs: 24,
      packetLossPercent: 0.1,
      gpuCaptureEngine: "DXGI_DESKTOP_DUPLICATION",
      aiProviderStatus: "GEMINI_OPERATIONAL",
    },
    null,
    2,
  );

  const handleCopyBundle = () => {
    navigator.clipboard.writeText(diagnosticBundle);
    setCopiedBundle(true);
    setTimeout(() => setCopiedBundle(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto">
      <div className="pb-8 border-b border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight">Support & Troubleshooting</h1>
        <p className="text-slate-400 text-sm mt-1">Resolve common connectivity issues and generate privacy-safe diagnostic support bundles.</p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Issue Selector */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Common Topics</h3>

          <button
            onClick={() => setSelectedIssue("connection")}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-colors ${
              selectedIssue === "connection" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100"
            }`}
          >
            WebRTC Connection Issues
          </button>

          <button
            onClick={() => setSelectedIssue("device_offline")}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-colors ${
              selectedIssue === "device_offline" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100"
            }`}
          >
            Target Device Shows Offline
          </button>

          <button
            onClick={() => setSelectedIssue("ai_copilot")}
            className={`w-full text-left p-3 rounded-xl text-sm font-semibold transition-colors ${
              selectedIssue === "ai_copilot" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100"
            }`}
          >
            AI Diagnostics & Computer Use
          </button>
        </div>

        {/* Issue Detail & Wizard */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            {selectedIssue === "connection" && (
              <div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">Resolving WebRTC Connection Issues</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-slate-300 leading-relaxed">
                  <li><strong>Check Outbound UDP:</strong> NexusDesk uses direct WebRTC with automatic fallback to secure TURN relays (port 3478). Ensure your router does not block outbound UDP traffic.</li>
                  <li><strong>Windows Firewall:</strong> When prompted, ensure "Private Networks" is permitted for NexusDesk.exe.</li>
                  <li><strong>Restart Desktop Agent:</strong> Right-click the system tray icon and select <em>Restart NexusDesk</em>.</li>
                </ol>
              </div>
            )}

            {selectedIssue === "device_offline" && (
              <div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">Device Showing Offline</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Devices ping presence every 30 seconds. If a device is powered on but offline in your dashboard, check if the desktop client is active in the Windows system tray and connected to the internet.
                </p>
              </div>
            )}

            {selectedIssue === "ai_copilot" && (
              <div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">AI Diagnostics & Computer Use Guidance</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  NexusDesk AI never takes autonomous operating system actions without your interactive consent. Every proposed action requires approving a single-use 60-second token. You can click <strong>STOP AI</strong> at any moment to cancel active leases.
                </p>
              </div>
            )}
          </div>

          {/* Privacy-Safe Support Bundle Generator */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Safe Support Diagnostic Bundle</h3>
                <p className="text-xs text-slate-400">Contains hardware specs and network states. Never exports credentials, keys, or screen contents.</p>
              </div>
              <button
                onClick={handleCopyBundle}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedBundle ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                <span>{copiedBundle ? "Copied to Clipboard!" : "Copy Bundle"}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto select-all">
              {diagnosticBundle}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
