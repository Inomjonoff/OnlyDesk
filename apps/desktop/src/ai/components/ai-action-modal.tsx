import React, { useEffect, useState } from "react";
import { AiActionProposal } from "@nexusdesk/types";
import { AlertTriangle, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

export interface AIActionModalProps {
  proposal: AiActionProposal | null;
  onApprove: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  onClose: () => void;
}

export const AIActionModal: React.FC<AIActionModalProps> = ({
  proposal,
  onApprove,
  onReject,
  onClose,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  useEffect(() => {
    if (!proposal) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((proposal.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [proposal, onClose]);

  if (!proposal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Action Approval Required</h3>
              <p className="text-xs text-slate-400">AI requested permission to execute action</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            {secondsRemaining}s
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Tool:</span>
              <span className="text-indigo-400 font-bold">{proposal.tool}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Risk Level:</span>
              <span className="text-amber-400">{proposal.risk}</span>
            </div>
            <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
              <span className="text-slate-500">Parameters:</span>
              <pre className="text-[11px] text-slate-300 overflow-x-auto p-1 bg-slate-900 rounded">
                {JSON.stringify(proposal.arguments, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <span className="font-medium text-slate-300">Reason:</span>
            <p className="text-slate-400 mt-0.5">{proposal.reason}</p>
          </div>

          {proposal.expectedResult && (
            <div>
              <span className="font-medium text-slate-300">Expected Outcome:</span>
              <p className="text-slate-400 mt-0.5">{proposal.expectedResult}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Bound to active session
          </span>
          <span className="font-mono">{proposal.argumentsHash.slice(0, 8)}</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => onApprove(proposal.proposalId)}
            className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve & Execute
          </button>
          <button
            onClick={() => onReject(proposal.proposalId)}
            className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};
