"use client";

import { useState, useEffect } from "react";
import { Monitor, Laptop, Plus, Trash2, Edit2, Check, ShieldCheck, Clock, Circle, Sparkles, Download } from "lucide-react";

interface Device {
  id: string;
  displayId: string;
  name: string;
  platform: string;
  status: "ONLINE" | "OFFLINE" | "BUSY";
  lastSeen: string;
  fingerprint: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const sampleDevices: Device[] = [
    {
      id: "dev_sample_1",
      displayId: "NXD-8821-9943",
      name: "Engineering Workstation (Sample)",
      platform: "WINDOWS",
      status: "ONLINE",
      lastSeen: "Just now",
      fingerprint: "SHA256:7f9a2b1c4e6d8a0f9e2a1b3c4d5e6f7a",
    },
    {
      id: "dev_sample_2",
      displayId: "NXD-1120-4491",
      name: "Office Laptop (Sample)",
      platform: "WINDOWS",
      status: "OFFLINE",
      lastSeen: "12 minutes ago",
      fingerprint: "SHA256:3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    },
  ];

  const fetchDevices = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const token = localStorage.getItem("nexus_access_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${apiUrl}/api/v1/devices`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.devices && data.devices.length > 0) {
          setDevices(data.devices);
        }
      }
    } catch {
      // Keep state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleStartRename = (dev: Device) => {
    setEditingId(dev.id);
    setEditName(dev.name);
  };

  const handleSaveRename = (id: string) => {
    setDevices(devices.map((d) => (d.id === id ? { ...d, name: editName } : d)));
    setEditingId(null);
  };

  const handleRevoke = (id: string) => {
    if (confirm("Are you sure you want to revoke and unpair this device? It will be immediately disconnected.")) {
      setDevices(devices.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Registered Devices</h1>
          <p className="text-slate-400 text-sm mt-1">Manage paired computers, presence status, and cryptographic device authorizations.</p>
        </div>
        <a
          href="/download"
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Device</span>
        </a>
      </div>

      {/* Empty State vs Devices Grid */}
      {devices.length === 0 ? (
        <div className="mt-12 bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center mx-auto mb-4 text-blue-400">
            <Laptop className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">No Paired Devices Yet</h3>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            Install the NexusDesk Desktop Agent on your computer and sign in. Your machine will automatically generate a zero-trust Ed25519 keypair and appear here.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/download"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Download Desktop Agent</span>
            </a>
            <button
              onClick={() => setDevices(sampleDevices)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Load Sample Devices</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {devices.map((dev) => (
            <div key={dev.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Laptop className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      {editingId === dev.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 bg-slate-950 border border-blue-500 rounded text-sm text-slate-100 font-semibold"
                          />
                          <button onClick={() => handleSaveRename(dev.id)} className="p-1 hover:text-emerald-400">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-100">{dev.name}</h3>
                          <button onClick={() => handleStartRename(dev)} className="text-slate-500 hover:text-slate-300">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <span className="text-xs font-mono text-slate-400 font-semibold">{dev.displayId}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-950/60">
                    <Circle
                      className={`w-2 h-2 fill-current ${
                        dev.status === "ONLINE" ? "text-emerald-400" : dev.status === "BUSY" ? "text-amber-400" : "text-slate-500"
                      }`}
                    />
                    <span className={dev.status === "ONLINE" ? "text-emerald-300" : "text-slate-400"}>{dev.status}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-6 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Platform</span>
                    <span className="font-medium text-slate-200">{dev.platform}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Presence</span>
                    <span className="font-medium text-slate-200">{dev.lastSeen || "Just now"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Key Fingerprint</span>
                    <span className="font-mono text-slate-400 truncate max-w-[200px]">{dev.fingerprint}</span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <a
                  href={`/dashboard?target=${dev.displayId}`}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                >
                  Connect Now
                </a>
                <button
                  onClick={() => handleRevoke(dev.id)}
                  className="px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
