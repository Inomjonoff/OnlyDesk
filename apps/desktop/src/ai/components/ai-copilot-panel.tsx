import React, { useState } from "react";
import { AiActionProposal, AiMessage } from "@nexusdesk/types";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  StopCircle,
} from "lucide-react";

export interface AICopilotPanelProps {
  sessionId: string;
  messages: AiMessage[];
  pendingProposals: AiActionProposal[];
  onSendMessage: (text: string) => Promise<void>;
  onAnalyzeScreen: () => Promise<void>;
  onApproveProposal: (proposalId: string) => Promise<void>;
  onRejectProposal: (proposalId: string) => Promise<void>;
  onEmergencyStop: () => void;
  isEmergencyStopped: boolean;
  isGenerating?: boolean;
}

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({
  messages,
  pendingProposals,
  onSendMessage,
  onAnalyzeScreen,
  onApproveProposal,
  onRejectProposal,
  onEmergencyStop,
  isEmergencyStopped,
  isGenerating = false,
}) => {
  const [inputText, setInputText] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    const text = inputText;
    setInputText("");
    await onSendMessage(text);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 w-96 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              AI Copilot
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                Active
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Safe remote assistance</p>
          </div>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={onEmergencyStop}
          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
            isEmergencyStopped
              ? "bg-rose-500 text-white animate-pulse"
              : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
          }`}
          title="Immediately halt all AI actions"
        >
          <StopCircle className="w-3.5 h-3.5" />
          {isEmergencyStopped ? "STOPPED" : "STOP AI"}
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => onSendMessage("Why is the computer slow?")}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-indigo-400" />
          Why is it slow?
        </button>
        <button
          onClick={onAnalyzeScreen}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors flex items-center gap-1"
        >
          <Eye className="w-3 h-3 text-cyan-400" />
          Analyze Screen
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Bot className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
            <p className="text-sm font-medium text-slate-400">How can I help you today?</p>
            <p className="text-xs mt-1">
              Ask questions, request visual diagnostics, or propose safe optimizations.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.messageId}
              className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : msg.role === "tool_result"
                      ? "bg-slate-800/90 text-slate-300 border border-slate-700 font-mono"
                      : "bg-slate-800/70 text-slate-200 border border-slate-700/60 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-60">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pending Action Proposals Card */}
        {pendingProposals.map((proposal) => (
          <div
            key={proposal.proposalId}
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200 text-xs space-y-2 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                Action Proposal
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono">
                {proposal.risk}
              </span>
            </div>

            <p className="text-slate-300 font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800">
              Tool: <span className="text-indigo-400 font-bold">{proposal.tool}</span>
              <br />
              Target: {JSON.stringify(proposal.arguments)}
            </p>

            <p className="text-slate-400 text-[11px]">{proposal.reason}</p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onApproveProposal(proposal.proposalId)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                onClick={() => onRejectProposal(proposal.proposalId)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
            AI is analyzing session diagnostics…
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask AI Copilot…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Human approval enforced
          </span>
          <span>Google Gemini 2.0 Flash</span>
        </div>
      </form>
    </div>
  );
};
