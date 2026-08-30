"use client";

import { Download, ShieldCheck, CheckCircle2, AlertTriangle, Monitor, HardDrive, Cpu } from "lucide-react";

export default function DownloadPage() {
  const version = "v1.0.0-beta.1";
  const releaseDate = "2026-08-30";
  const sha256Checksum = "9e5c4a3f12a87b41e97d6205739bf896e0015b6375c3db11f185c13e54b611e0";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <a href="/" className="flex items-center gap-2 text-lg font-bold text-slate-100 hover:text-blue-400 transition-colors">
          <Monitor className="w-5 h-5 text-blue-500" />
          <span>NexusDesk <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30">BETA</span></span>
        </a>
        <div className="flex items-center gap-4 text-sm font-medium">
          <a href="/status" className="text-slate-400 hover:text-slate-200">System Status</a>
          <a href="/help" className="text-slate-400 hover:text-slate-200">Support</a>
          <a href="/login" className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all">Sign In</a>
        </div>
      </header>

      {/* Main Download Card */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 w-full flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/50 text-xs font-semibold text-blue-300 mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Official Public Beta Release</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-center tracking-tight mb-4">
          Download NexusDesk for Windows
        </h1>
        <p className="text-slate-400 text-center max-w-xl text-lg mb-10">
          Native low-latency screen capture, hardware-accelerated WebRTC streaming, safe remote input, and autonomous AI diagnostic copilot.
        </p>

        {/* Primary Download Box */}
        <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Monitor className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">NexusDesk Desktop Client</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>Version {version}</span>
                  <span>•</span>
                  <span>Windows 10 / 11 (x64)</span>
                  <span>•</span>
                  <span>Released {releaseDate}</span>
                </div>
              </div>
            </div>

            <a
              href="/dist/NexusDesk-v1.0.0-beta.1-setup.exe"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>Download (.exe)</span>
            </a>
          </div>

          {/* Checksum Verification Box */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
              <span>SHA-256 Checksum</span>
              <span className="text-slate-500 font-mono">Hex Digest</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 break-all select-all">
              {sha256Checksum}
            </div>
          </div>

          {/* Unsigned Beta Advisory */}
          <div className="mt-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-300 mb-0.5">Unsigned Public Beta Advisory</strong>
              <span>
                As an open community beta, Windows SmartScreen may display an "Unknown Publisher" prompt upon first launch. Click <em>More Info → Run Anyway</em>. You can verify the installer's integrity anytime against the official SHA-256 hash above.
              </span>
            </div>
          </div>
        </div>

        {/* System Requirements Grid */}
        <div className="mt-12 w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-start gap-3">
            <Cpu className="w-4 h-4 text-blue-400 mt-1" />
            <div>
              <h4 className="text-xs font-bold text-slate-200">Processor</h4>
              <p className="text-xs text-slate-400 mt-0.5">64-bit Dual Core x86_64</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-start gap-3">
            <HardDrive className="w-4 h-4 text-blue-400 mt-1" />
            <div>
              <h4 className="text-xs font-bold text-slate-200">Memory</h4>
              <p className="text-xs text-slate-400 mt-0.5">2 GB RAM (4 GB recommended)</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-start gap-3">
            <Monitor className="w-4 h-4 text-blue-400 mt-1" />
            <div>
              <h4 className="text-xs font-bold text-slate-200">OS Support</h4>
              <p className="text-xs text-slate-400 mt-0.5">Windows 10, 11 (64-bit)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
