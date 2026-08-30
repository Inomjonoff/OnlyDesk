"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ArrowRight, Monitor, Download, ShieldCheck, Zap } from "lucide-react";

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(2);

  const steps = [
    {
      id: 1,
      title: "Account Created",
      description: "You've successfully registered and secured your user credentials.",
      status: "completed",
    },
    {
      id: 2,
      title: "Download & Pair Desktop Agent",
      description: "Install the NexusDesk Desktop Client on your machine and sign in.",
      status: "active",
      action: {
        label: "Download Desktop Client (.exe)",
        href: "/download",
      },
    },
    {
      id: 3,
      title: "Launch Test Remote Session",
      description: "Connect to your device or a demo machine to test WebRTC video, input, and AI Copilot.",
      status: "pending",
      action: {
        label: "Go to Dashboard",
        href: "/dashboard",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100">Welcome to NexusDesk AI</h1>
            <p className="text-slate-400 text-sm">Follow these 3 simple steps to start your first secure remote session.</p>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-6">
          {steps.map((s, index) => {
            const isCompleted = s.id < currentStep || s.status === "completed";
            const isActive = s.id === currentStep || s.status === "active";

            return (
              <div
                key={s.id}
                className={`p-5 rounded-xl border transition-all ${
                  isActive
                    ? "bg-slate-800/60 border-blue-500/50 shadow-md shadow-blue-500/10"
                    : isCompleted
                    ? "bg-slate-950/40 border-slate-800"
                    : "bg-slate-950/20 border-slate-900 opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isActive ? (
                      <div className="w-5 h-5 rounded-full border-2 border-blue-400 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-base font-bold ${isActive ? "text-blue-300" : isCompleted ? "text-slate-200" : "text-slate-400"}`}>
                        {s.id}. {s.title}
                      </h3>
                      {isCompleted && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{s.description}</p>

                    {isActive && s.action && (
                      <div className="mt-4 flex items-center gap-3">
                        <a
                          href={s.action.href}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{s.action.label}</span>
                        </a>
                        <button
                          onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
                        >
                          Next Step
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Need help during setup? <a href="/help" className="text-blue-400 hover:underline">View Troubleshooting Guide</a></span>
          <a href="/dashboard" className="text-slate-300 hover:text-white font-medium flex items-center gap-1">
            <span>Skip to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
