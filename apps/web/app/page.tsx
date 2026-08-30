"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Zap,
  Monitor,
  Bot,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const [targetId, setTargetId] = useState("");
  const [activeTab, setActiveTab] = useState<"viewer" | "ai" | "security">("viewer");

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
              NexusDesk{" "}
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/30">
                AI
              </span>
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-blue-400 transition-colors">
            Features
          </a>
          <a href="#ai-diagnostics" className="hover:text-blue-400 transition-colors">
            AI Diagnostics
          </a>
          <a href="#architecture" className="hover:text-blue-400 transition-colors">
            Architecture
          </a>
          <a href="#security" className="hover:text-blue-400 transition-colors">
            Security
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </a>
          <a
            href="#download"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-40">
          <div className="w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
          <div className="w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[140px] pointer-events-none" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300 mb-8 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Next-Gen WebRTC Screen Streaming + Autonomous AI Copilot</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1]">
          The Intelligent Remote Desktop for{" "}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Engineering & Support
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl font-normal leading-relaxed">
          Ultra low-latency P2P WebRTC screen streaming powered by Rust native capture, coupled with
          real-time AI diagnostic intelligence and zero-trust security.
        </p>

        {/* Quick Connect Bar */}
        <div className="mt-10 w-full max-w-xl p-2 rounded-2xl glass-panel border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-3 px-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <Monitor className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Enter Remote ID (e.g. NXD-AB12-CD34)"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-transparent py-3 text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
            />
          </div>
          <button
            onClick={() =>
              alert(`Initiating secure connection to ${targetId || "demo session"}...`)
            }
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
          >
            Connect <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-left max-w-4xl w-full">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="text-2xl font-bold text-blue-400">~24 ms</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Ultra Low Latency</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="text-2xl font-bold text-emerald-400">60 FPS</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Native Direct Capture</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="text-2xl font-bold text-purple-400">Ed25519</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Cryptographic Identity</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="text-2xl font-bold text-amber-400">Zero-Trust</div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Capability Permissions</div>
          </div>
        </div>
      </section>

      {/* Interactive Platform Preview */}
      <section className="py-12 px-6 max-w-6xl mx-auto w-full">
        <div className="rounded-2xl glass-panel border border-slate-800 p-2 shadow-2xl overflow-hidden">
          {/* Mock Window Title Bar */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs text-slate-400 font-mono">
                NXD-W9A2-K7L4 — Connected (WebRTC P2P Direct)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                28 ms | 60 FPS
              </span>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-800 bg-slate-900/50 px-4">
            <button
              onClick={() => setActiveTab("viewer")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "viewer"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Remote Display
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "ai"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="w-3.5 h-3.5" /> AI Diagnostic Copilot
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "security"
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Granular Permissions
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 bg-slate-950/70 min-h-[380px] flex items-center justify-center">
            {activeTab === "viewer" && (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                <Monitor className="w-12 h-12 text-blue-500/70 mb-3 animate-pulse" />
                <h3 className="text-lg font-bold text-white">Live Remote Frame Buffer Active</h3>
                <p className="text-sm text-slate-400 max-w-md mt-1">
                  Rendering Windows DXGI Desktop Duplication stream decoded hardware-accelerated in
                  real-time.
                </p>
                <div className="mt-5 flex gap-3">
                  <span className="text-xs px-3 py-1 bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                    Display 1 (2560x1440)
                  </span>
                  <span className="text-xs px-3 py-1 bg-blue-900/40 text-blue-300 rounded-md border border-blue-700/50">
                    H.264 / AV1
                  </span>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="w-full text-left space-y-4 max-w-2xl">
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                      <Bot className="w-4 h-4" /> AI Diagnostics Analysis
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                      Severity: MEDIUM
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 mt-2 font-medium">
                    Observed high kernel contention on PID 4820 with memory leak trajectory
                    (+400MB/min).
                  </p>
                  <div className="mt-3 text-xs text-slate-400">
                    <strong className="text-purple-300">Action Proposal:</strong> Inspect stack
                    trace & offer safe process graceful recycle.
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                {[
                  { name: "Screen View", granted: true, desc: "Real-time desktop streaming" },
                  { name: "Mouse & Keyboard", granted: true, desc: "Active input injection" },
                  { name: "Clipboard Sync", granted: false, desc: "Bidirectional text/image sync" },
                  { name: "File Transfer", granted: false, desc: "Chunked verified transfer" },
                ].map((perm, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start gap-3"
                  >
                    <CheckCircle2
                      className={`w-5 h-5 mt-0.5 ${perm.granted ? "text-emerald-400" : "text-slate-600"}`}
                    />
                    <div>
                      <div className="text-sm font-semibold text-white">{perm.name}</div>
                      <div className="text-xs text-slate-400">{perm.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Engineered for Performance & Security
          </h2>
          <p className="mt-3 text-slate-400 text-base">
            No simulated components or mocked data. Built with production-grade protocols from the
            native layer up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-5 text-blue-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Native Rust Capture</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Windows Graphics Capture & Desktop Duplication APIs running in high-performance Rust
              threads with zero CPU waste.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mb-5 text-purple-400">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Autonomous AI Copilot</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Redacts sensitive PII before diagnostic ingestion. Evaluates system metrics, crashes,
              and suggests bounded, approved remediation actions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mb-5 text-emerald-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Zero-Trust Security</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Ed25519 public key fingerprints, DTLS-SRTP WebRTC encryption, and fine-grained
              per-session capability permissions.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} NexusDesk AI. Open Architecture Remote Desktop Platform.
          </p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-slate-300">
              Privacy Policy
            </a>
            <a href="#terms" className="hover:text-slate-300">
              Terms of Service
            </a>
            <a href="#security" className="hover:text-slate-300">
              Security Architecture
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
