import * as React from "react";
import { cn } from "./utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline" | "online" | "offline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-blue-900/50 text-blue-300 border border-blue-700/50",
    success: "bg-emerald-950/60 text-emerald-400 border border-emerald-700/50",
    warning: "bg-amber-950/60 text-amber-400 border border-amber-700/50",
    danger: "bg-rose-950/60 text-rose-400 border border-rose-700/50",
    outline: "border border-slate-700 text-slate-300",
    online:
      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5",
    offline: "bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide",
        variantStyles,
        className,
      )}
      {...props}
    >
      {variant === "online" && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {variant === "offline" && <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
      {props.children}
    </span>
  );
}
