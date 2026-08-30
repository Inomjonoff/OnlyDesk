import React from "react";
import { Monitor, MousePointer, Folder, Clipboard, Bot, XCircle } from "lucide-react";
import { SessionPermission } from "@nexusdesk/types";

export interface SessionHudProps {
  sessionId?: string;
  durationSec: number;
  permissions: SessionPermission[];
  onStopRemoteControl: () => void;
  onEmergencyStopAI: () => void;
  onEndSession: () => void;
}

export const SessionHud: React.FC<SessionHudProps> = ({
  durationSec,
  permissions,
  onStopRemoteControl,
  onEmergencyStopAI,
  onEndSession,
}) => {
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const hasPermission = (p: SessionPermission) => permissions.includes(p);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 text-xs select-none">
      {/* Session Timer & Status */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono font-bold text-slate-200">{formatTime(durationSec)}</span>
      </div>

      {/* Live Permission Chips */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <span title="Screen View" className={`p-1.5 rounded-lg ${hasPermission("SCREEN_VIEW") ? "bg-blue-600/30 text-blue-400" : "opacity-30"}`}>
          <Monitor className="w-3.5 h-3.5" />
        </span>
        <span title="Mouse/Keyboard" className={`p-1.5 rounded-lg ${hasPermission("MOUSE_CONTROL") ? "bg-emerald-600/30 text-emerald-400" : "opacity-30"}`}>
          <MousePointer className="w-3.5 h-3.5" />
        </span>
        <span title="File Transfer" className={`p-1.5 rounded-lg ${hasPermission("FILE_WRITE") || hasPermission("FILE_READ") ? "bg-purple-600/30 text-purple-400" : "opacity-30"}`}>
          <Folder className="w-3.5 h-3.5" />
        </span>
        <span title="Clipboard" className={`p-1.5 rounded-lg ${hasPermission("CLIPBOARD_WRITE") || hasPermission("CLIPBOARD_READ") ? "bg-amber-600/30 text-amber-400" : "opacity-30"}`}>
          <Clipboard className="w-3.5 h-3.5" />
        </span>
        <span title="AI Copilot" className={`p-1.5 rounded-lg ${hasPermission("AI_COMPUTER_USE") ? "bg-indigo-600/30 text-indigo-400" : "opacity-30"}`}>
          <Bot className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Action & Emergency Buttons */}
      <div className="flex items-center gap-2">
        {hasPermission("MOUSE_CONTROL") && (
          <button
            onClick={onStopRemoteControl}
            className="px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-800/40 text-[11px] font-bold transition-all active:scale-95"
          >
            Revoke Input
          </button>
        )}

        <button
          onClick={onEmergencyStopAI}
          className="px-2.5 py-1 rounded-lg bg-rose-950/90 text-rose-300 hover:bg-rose-900 border border-rose-800/50 text-[11px] font-bold transition-all active:scale-95"
        >
          STOP AI
        </button>

        <button
          onClick={onEndSession}
          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>End</span>
        </button>
      </div>
    </div>
  );
};
