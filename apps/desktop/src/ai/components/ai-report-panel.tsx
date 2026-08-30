import React from "react";
import { AiSessionReport } from "@nexusdesk/types";
import { FileText, CheckCircle2, AlertCircle, Wrench, Shield } from "lucide-react";

export interface AIReportPanelProps {
  report: AiSessionReport | null;
  onClose: () => void;
}

export const AIReportPanel: React.FC<AIReportPanelProps> = ({ report, onClose }) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-base">AI Session Intelligence Report</h2>
              <p className="text-xs text-slate-400">Session ID: {report.sessionId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono ${
                report.resolution === "RESOLVED"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              {report.resolution}
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Executive Summary
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">{report.summary}</p>
        </div>

        {/* Executed Actions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-indigo-400" />
            Actions Executed & Verified ({report.actionsExecuted.length})
          </h4>
          {report.actionsExecuted.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No modifications were executed during this session.
            </p>
          ) : (
            <div className="space-y-1.5">
              {report.actionsExecuted.map((act) => (
                <div
                  key={act.actionId}
                  className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono text-indigo-300 font-medium">{act.tool}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">{act.result}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-cyan-400" />
            Recommendations
          </h4>
          <div className="space-y-1.5">
            {report.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 text-xs"
              >
                <p className="font-medium text-slate-200">{rec.recommendation}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Evidence: {rec.evidence}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Generated with verified audit telemetry by {report.provider} ({report.model})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
