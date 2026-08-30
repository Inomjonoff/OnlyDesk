"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, Monitor, ShieldCheck, Sparkles, KeyRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@nexusdesk.uz");
  const [password, setPassword] = useState("admin123");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nexusdesk-api-zygp.onrender.com";
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, twoFactorCode: twoFactorCode || undefined }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "2FA_REQUIRED") {
          setShowTwoFactor(true);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error?.message || "Invalid email or password.");
      }

      if (data.tokens?.accessToken) {
        localStorage.setItem("nexus_access_token", data.tokens.accessToken);
        localStorage.setItem("nexus_refresh_token", data.tokens.refreshToken);
        localStorage.setItem("nexus_user", JSON.stringify(data.user));
      }

      window.location.href = "/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (
          err.name === "AbortError" ||
          err.message.includes("Failed to fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("is not valid JSON")
        ) {
          // Seamless Offline Demo Fallback
          const userName = email.split("@")[0] || "Demo User";
          localStorage.setItem("nexus_user", JSON.stringify({ email: email || "demo.engineer@nexusdesk.uz", name: userName }));
          localStorage.setItem("nexus_demo_mode", "true");
          window.location.href = "/dashboard";
          return;
        }
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem("nexus_user", JSON.stringify({ email: "demo.engineer@nexusdesk.uz", name: "Demo User" }));
    localStorage.setItem("nexus_demo_mode", "true");
    window.location.href = "/dashboard";
  };

  const handleFillAdmin = () => {
    setEmail("admin@nexusdesk.uz");
    setPassword("admin123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col justify-center items-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/25 mb-3">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">NexusDesk AI</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to your control center</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-black/50">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button 
                type="button" 
                onClick={handleFillAdmin}
                className="underline hover:text-red-300 font-semibold"
              >
                Reset to Admin
              </button>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="mb-6 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              <span>Default: <strong>admin@nexusdesk.uz</strong></span>
            </div>
            <button
              type="button"
              onClick={handleFillAdmin}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium transition-colors"
            >
              Fill Credentials
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexusdesk.uz"
                  className="w-full bg-slate-950 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <a href="#forgot" className="text-xs text-blue-400 hover:text-blue-300">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {showTwoFactor && (
              <div className="pt-2 animate-in fade-in duration-150">
                <label className="text-xs font-semibold text-purple-300 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> 2FA Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-950 px-4 py-2.5 rounded-xl border border-purple-800 text-sm font-mono text-center tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Explore in Standalone Demo Mode
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
