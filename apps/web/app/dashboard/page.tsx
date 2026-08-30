"use client";

import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Plus,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCheck,
  Copy,
  LogOut,
  Clock,
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { SessionPermission } from "@nexusdesk/types";

interface DeviceItem {
  id: string;
  displayId: string;
  name: string;
  platform: "WINDOWS" | "MACOS" | "LINUX";
  osVersion: string;
  appVersion: string;
  status: "ONLINE" | "OFFLINE" | "BUSY" | "STALE";
  fingerprint: string;
  lastSeenAt: string;
  metrics?: {
    cpuPercent: number;
    memoryUsedMb: number;
    memoryTotalMb: number;
  };
}

interface ActiveSessionModalState {
  sessionId: string;
  targetDevice: DeviceItem;
  status:
    | "WAITING_FOR_APPROVAL"
    | "APPROVED"
    | "NEGOTIATING"
    | "READY_FOR_WEBRTC"
    | "REJECTED"
    | "CANCELLED"
    | "EXPIRED";
  countdown: number;
  grantedPermissions?: SessionPermission[];
  errorMessage?: string;
}

export default function DashboardPage() {
  const sampleDashboardDevices: DeviceItem[] = [
    {
      id: "dev_sample_1",
      displayId: "NXD-W9A2-K7L4",
      name: "Engineering Workstation (Sample)",
      platform: "WINDOWS",
      osVersion: "Windows 11 Pro 23H2",
      appVersion: "1.0.0",
      status: "ONLINE",
      fingerprint: "SHA256:4a8b7c9d0e1f2a3b4c5d6e7f8a9b0c1d",
      lastSeenAt: new Date().toISOString(),
      metrics: {
        cpuPercent: 14.2,
        memoryUsedMb: 6144,
        memoryTotalMb: 32768,
      },
    },
    {
      id: "dev_sample_2",
      displayId: "NXD-M3P1-X9Y2",
      name: "Office Laptop (Sample)",
      platform: "WINDOWS",
      osVersion: "Windows 11",
      appVersion: "1.0.0",
      status: "ONLINE",
      fingerprint: "SHA256:1f2a3b4c5d6e7f8a9b0c1d4a8b7c9d0e",
      lastSeenAt: new Date().toISOString(),
      metrics: {
        cpuPercent: 8.5,
        memoryUsedMb: 8192,
        memoryTotalMb: 16384,
      },
    },
  ];

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSessionModalState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchDevices = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("nexus_access_token");
      const res = await fetch(`${apiUrl}/api/v1/devices`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.devices && data.devices.length > 0) {
          setDevices(data.devices);
        }
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Initiate Remote Session
  const handleInitiateSession = async (device: DeviceItem) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("nexus_access_token") || "mock_user_token";
      const res = await fetch(`${apiUrl}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetDeviceId: device.id,
          requestedPermissions: ["SCREEN_VIEW", "MOUSE_CONTROL", "KEYBOARD_CONTROL", "AI_ANALYSIS"],
        }),
      });

      const data = await res.json();
      const sessionId = data.data?.sessionId || `ses_${Date.now()}`;

      setActiveSession({
        sessionId,
        targetDevice: device,
        status: "WAITING_FOR_APPROVAL",
        countdown: 60,
      });

      // Connect to signaling websocket to listen for approval
      connectSignaling(sessionId);
    } catch {
      // Fallback
      setActiveSession({
        sessionId: `ses_${Date.now()}`,
        targetDevice: device,
        status: "WAITING_FOR_APPROVAL",
        countdown: 60,
      });
    }
  };

  const connectSignaling = (sessionId: string) => {
    try {
      const token = localStorage.getItem("nexus_access_token") || "mock_user_token";
      const ws = new WebSocket(`ws://localhost:4001/ws?token=${token}&deviceId=dev_web_client`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "session.subscribe", sessionId }));
      };

      ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (envelope.type === "session.accepted") {
            setActiveSession((prev) =>
              prev
                ? {
                    ...prev,
                    status: "READY_FOR_WEBRTC",
                    grantedPermissions: envelope.payload.grantedPermissions,
                  }
                : null,
            );
          } else if (envelope.type === "session.rejected") {
            setActiveSession((prev) =>
              prev
                ? {
                    ...prev,
                    status: "REJECTED",
                    errorMessage: "The remote user rejected the connection request.",
                  }
                : null,
            );
          } else if (envelope.type === "session.cancelled") {
            setActiveSession(null);
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Offline fallback
    }
  };

  // Countdown timer for active session modal
  useEffect(() => {
    if (!activeSession || activeSession.status !== "WAITING_FOR_APPROVAL") return;
    if (activeSession.countdown <= 0) {
      setActiveSession((prev) =>
        prev ? { ...prev, status: "EXPIRED", errorMessage: "Request timed out." } : null,
      );
      return;
    }

    const timer = setInterval(() => {
      setActiveSession((prev) => (prev ? { ...prev, countdown: prev.countdown - 1 } : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  const handleCancelSession = async () => {
    if (activeSession) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        await fetch(`${apiUrl}/api/v1/sessions/${activeSession.sessionId}/cancel`, {
          method: "POST",
        });
      } catch {
        // Fallback
      }
      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({ type: "session.cancel", sessionId: activeSession.sessionId }),
        );
        wsRef.current.close();
      }
    }
    setActiveSession(null);
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.displayId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="glass-panel border-b border-slate-800/80 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              <Monitor className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              NexusDesk{" "}
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300">
                AI
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Device
          </button>
          <Link
            href="/login"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Page Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Device Fleet & Signaling Control
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time session negotiation, presence monitoring, and connection approval
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900/90 pl-9 pr-4 py-2 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64 transition-colors"
              />
            </div>
            <button
              onClick={fetchDevices}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Device Grid or Empty State */}
        {filteredDevices.length === 0 ? (
          <div className="p-12 rounded-3xl glass-panel border border-slate-800 text-center max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center mx-auto mb-4 text-blue-400">
              <Monitor className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">No Paired Devices Online</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Install the NexusDesk Desktop Agent on your computer and sign in to establish a zero-trust WebRTC connection.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/download"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <span>Download Desktop Agent</span>
              </Link>
              <button
                onClick={() => setDevices(sampleDashboardDevices)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
              >
                <span>Preview Sample Devices</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDevices.map((device) => {
              const isOnline = device.status === "ONLINE";

              return (
                <div
                  key={device.id}
                  className="p-5 rounded-2xl glass-panel border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-xl"
                >
                  <div>
                    {/* Top line with OS & Presence Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {device.platform}
                      </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                        }`}
                      />
                      {device.status}
                    </span>
                  </div>

                  {/* Device Name & Display ID */}
                  <h3 className="text-base font-bold text-white tracking-tight truncate">
                    {device.name}
                  </h3>
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {device.displayId}
                    </span>
                    <button
                      onClick={() => handleCopy(device.displayId, device.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedId === device.id ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Telemetry if online */}
                  {isOnline && device.metrics && (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                        <div className="text-slate-500 font-medium">CPU Load</div>
                        <div className="text-slate-200 font-bold mt-0.5">
                          {device.metrics.cpuPercent}%
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                        <div className="text-slate-500 font-medium">Memory</div>
                        <div className="text-slate-200 font-bold mt-0.5">
                          {(device.metrics.memoryUsedMb / 1024).toFixed(1)} GB /{" "}
                          {(device.metrics.memoryTotalMb / 1024).toFixed(0)} GB
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fingerprint */}
                  <div className="mt-3 text-[10px] font-mono text-slate-500 truncate">
                    {device.fingerprint}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{device.osVersion}</span>
                  <button
                    disabled={!isOnline}
                    onClick={() => handleInitiateSession(device)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Request Session <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Active Session Negotiation Modal */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-base">
                <Radio className="w-5 h-5 animate-pulse" />
                <span>Remote Session Signaling</span>
              </div>
              <button
                onClick={handleCancelSession}
                className="text-slate-400 hover:text-white text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-500">Target Device</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {activeSession.targetDevice.name}
                </div>
                <div className="text-xs font-mono text-blue-400 mt-0.5">
                  {activeSession.targetDevice.displayId}
                </div>
              </div>

              {activeSession.status === "WAITING_FOR_APPROVAL" && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                    <Clock className="w-4 h-4 animate-spin text-amber-400" />
                    Waiting for remote host approval...
                  </div>
                  <div className="text-2xl font-mono font-bold text-amber-400">
                    {activeSession.countdown}s
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    A connection prompt has been dispatched to the target desktop agent.
                  </p>
                </div>
              )}

              {activeSession.status === "READY_FOR_WEBRTC" && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Session Approved & Ready for WebRTC
                  </div>
                  <p className="text-xs text-emerald-300/80">
                    Target host accepted the connection. Authenticated signaling channel is
                    established.
                  </p>
                </div>
              )}

              {activeSession.status === "REJECTED" && (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-red-400">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    Connection Rejected
                  </div>
                  <p className="text-xs text-red-300/80">{activeSession.errorMessage}</p>
                </div>
              )}

              {activeSession.status === "EXPIRED" && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-center space-y-1">
                  <div className="text-xs font-semibold">Request Expired</div>
                  <p className="text-xs">{activeSession.errorMessage}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCancelSession}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
              >
                {activeSession.status === "READY_FOR_WEBRTC" ? "Close" : "Cancel Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Device Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Enroll New Desktop Agent</h3>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-4 text-xs text-slate-300">
              <p>
                To connect a computer to your fleet, download and start the NexusDesk Desktop Client
                on target machine:
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 font-mono border border-slate-800 text-slate-200 flex items-center justify-between">
                <span>pnpm --filter @nexusdesk/desktop dev</span>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText("pnpm --filter @nexusdesk/desktop dev")
                  }
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-200">
                <div className="font-bold mb-1">Cryptographic Key Derivation</div>
                The desktop agent will automatically generate a hardware Ed25519 keypair and appear
                in your fleet with an `ONLINE` heartbeat.
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
