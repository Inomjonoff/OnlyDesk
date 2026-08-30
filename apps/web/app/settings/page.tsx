"use client";

import { useState } from "react";
import { Shield, Eye, Bot, Bell, Key, Lock, CheckCircle2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"security" | "privacy" | "ai" | "notifications">("security");

  // State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState("ask");
  const [clipboardPolicy, setClipboardPolicy] = useState("ask");
  const [aiProvider, setAiProvider] = useState("google");
  const [aiMode, setAiMode] = useState("ASK_BEFORE_ACTION");
  const [visionEnabled, setVisionEnabled] = useState(true);
  const [computerUseEnabled, setComputerUseEnabled] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto">
      <div className="pb-8 border-b border-slate-800">
        <h1 className="text-3xl font-extrabold tracking-tight">Security & Preferences</h1>
        <p className="text-slate-400 text-sm mt-1">Configure account security, privacy boundaries, AI automation policies, and notifications.</p>
      </div>

      {/* Tabs Header */}
      <div className="mt-6 flex items-center gap-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "security" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security Center</span>
        </button>

        <button
          onClick={() => setActiveTab("privacy")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "privacy" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Privacy & Consent</span>
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "ai" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Copilot</span>
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "notifications" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-8">
        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                <span>Two-Factor Authentication (2FA)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Protect your account with TOTP authenticator apps (Google Authenticator, Authy, 1Password).</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">Status: {twoFactorEnabled ? "Enabled" : "Disabled"}</span>
                <button
                  onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                    twoFactorEnabled ? "bg-rose-950/60 text-rose-300 border border-rose-800/40 hover:bg-rose-900/80" : "bg-blue-600 hover:bg-blue-500 text-white"
                  }`}
                >
                  {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <span>Password & Active Sessions</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Change master password and invalidate all active session tokens on other devices.</p>
              <div className="mt-4">
                <button
                  onClick={() => alert("All other active sessions have been invalidated.")}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Terminate All Other Sessions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === "privacy" && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-100">Session Privacy Defaults</h3>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Session Recording Policy</label>
                <select
                  value={recordingConsent}
                  onChange={(e) => setRecordingConsent(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                >
                  <option value="ask">Always Ask for Explicit Host Consent (Recommended)</option>
                  <option value="deny">Always Deny Recording Requests</option>
                  <option value="allow">Auto-Consent (Trusted internal devices only)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Remote Clipboard Synchronization</label>
                <select
                  value={clipboardPolicy}
                  onChange={(e) => setClipboardPolicy(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                >
                  <option value="ask">Ask Before Syncing Clipboard</option>
                  <option value="allow">Bi-directional Auto-Sync</option>
                  <option value="deny">Disable Clipboard Sharing</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <span>AI Session Copilot Policy</span>
              </h3>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">AI Provider Model</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                >
                  <option value="google">Google Gemini 2.0 Flash (Cloud Fast)</option>
                  <option value="openai">OpenAI GPT-4o (Cloud Reasoning)</option>
                  <option value="anthropic">Anthropic Claude 3.7 Sonnet (Advanced Computer Use)</option>
                  <option value="ollama">Ollama (100% Local / Offline Private Model)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Automation Safety Mode</label>
                <select
                  value={aiMode}
                  onChange={(e) => setAiMode(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200"
                >
                  <option value="ASK_BEFORE_ACTION">Ask Before Action (Human-in-the-Loop Approval Required)</option>
                  <option value="RECOMMEND">Recommend Only (Read-Only Diagnostics)</option>
                  <option value="OBSERVE_ONLY">Observe Only (Zero Actions)</option>
                  <option value="LIMITED_AUTO">Limited Autonomous (Safe Read Diagnostics Only)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">On-Demand Screen Vision Analysis</h4>
                  <p className="text-xs text-slate-400">Allows single-frame visual analysis upon user request</p>
                </div>
                <input
                  type="checkbox"
                  checked={visionEnabled}
                  onChange={(e) => setVisionEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">AI Computer Use (GUI Control)</h4>
                  <p className="text-xs text-slate-400">Permits bounded 30-second control leases with immediate Stop AI button</p>
                </div>
                <input
                  type="checkbox"
                  checked={computerUseEnabled}
                  onChange={(e) => setComputerUseEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-100">Desktop & Email Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                  <span>Notify when a new device pairs with my account</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                  <span>Notify when an incoming remote session request arrives</span>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                  <span>Notify when AI proposes an operating system action</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
        {savedSuccess ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Preferences saved successfully!</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Changes take effect immediately on active clients.</span>
        )}

        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
