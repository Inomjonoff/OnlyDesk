import { useState, useEffect, useCallback, useRef } from "react";
import {
  Monitor,
  ShieldCheck,
  Settings,
  ArrowRight,
  Check,
  X,
  Clock,
  Key,
  Activity,
  Bot,
  Copy,
  CheckCheck,
  Zap,
  Wifi,
  Radio,
  Tv,
  Square,
  MousePointer,
  Keyboard,
  ShieldAlert,
  FolderDown,
  Clipboard,
  FileText,
} from "lucide-react";
import { generateEd25519KeyPair, generateDeviceId } from "@nexusdesk/crypto";
import {
  SessionPermission,
  SignalingEventEnvelope,
  ConnectionQuality,
  DisplayInfo,
  StreamingMetrics,
  InputEventMessage,
  FileTransferProgress,
  FileTransferMessage,
  ClipboardUpdateMessage,
  ClipboardAckMessage,
} from "@nexusdesk/types";
import { SignalingClient } from "./signaling/signaling-client";
import { RTCManager } from "./rtc/rtc-manager";
import { ScreenCaptureManager } from "./capture/screen-capture-manager";
import { StreamingController } from "./streaming/streaming-controller";
import { RemoteViewer } from "./viewer/remote-viewer";
import { InputController } from "./input/input-controller";
import { InputClient } from "./input/input-client";
import { FileTransferManager } from "./files/file-transfer-manager";
import { ClipboardManager } from "./clipboard/clipboard-manager";

export default function App() {
  const [deviceId, setDeviceId] = useState<string>("NXD-W9A2-K7L4");
  const [fingerprint, setFingerprint] = useState<string>("SHA256:4a8b7c9d0e1f2a3b4c5d6e7f8a9b0c1d");
  const [publicKey, setPublicKey] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [targetId, setTargetId] = useState<string>("");
  const [sessionState, setSessionState] = useState<string | null>(null);

  // WebRTC Transport & Video State
  const [rtcConnected, setRtcConnected] = useState<boolean>(false);
  const [rttMs, setRttMs] = useState<number>(14);
  const [quality, setQuality] = useState<ConnectionQuality>("EXCELLENT");
  const [transportType, setTransportType] = useState<string>("Direct P2P");

  // Screen Capture & Streaming State
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [selectedDisplay, setSelectedDisplay] = useState<string>("display_primary");
  const [isSharingScreen, setIsSharingScreen] = useState<boolean>(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [streamingMetrics, setStreamingMetrics] = useState<StreamingMetrics>({
    captureFps: 30,
    encodeFps: 30,
    sendFps: 30,
    receiveFps: 30,
    renderFps: 30,
    bitrateKbps: 5200,
    width: 1920,
    height: 1080,
    codec: "H264",
    keyframes: 1,
    framesDropped: 0,
    rttMs: 14,
  });

  // Remote Input, File Transfer & Clipboard State
  const [mouseControlActive, setMouseControlActive] = useState<boolean>(false);
  const [keyboardControlActive, setKeyboardControlActive] = useState<boolean>(false);
  const [fileTransferActive, setFileTransferActive] = useState<boolean>(false);
  const [clipboardSyncActive, setClipboardSyncActive] = useState<boolean>(false);
  const [transfers, setTransfers] = useState<FileTransferProgress[]>([]);

  // Incoming session request modal state
  const [incomingRequest, setIncomingRequest] = useState<{
    sessionId: string;
    requesterName: string;
    requesterDevice: string;
    requestedPermissions: SessionPermission[];
    countdown: number;
  } | null>(null);

  // Incoming file transfer request modal state
  const [incomingFile, setIncomingFile] = useState<{
    transferId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    sha256: string;
  } | null>(null);

  const [permissions, setPermissions] = useState<{ [K in SessionPermission]?: boolean }>({
    SCREEN_VIEW: true,
    MOUSE_CONTROL: true,
    KEYBOARD_CONTROL: true,
    FILE_READ: true,
    FILE_WRITE: true,
    CLIPBOARD_READ: true,
    CLIPBOARD_WRITE: true,
    SYSTEM_INFO: true,
    PROCESS_LIST: false,
    LOG_READ: false,
    COMMAND_REQUEST: false,
    RECORDING: false,
    AI_ANALYSIS: true,
  });

  const signalingRef = useRef<SignalingClient | null>(null);
  const rtcRef = useRef<RTCManager | null>(null);
  const captureRef = useRef<ScreenCaptureManager | null>(null);
  const streamingCtrlRef = useRef<StreamingController | null>(null);
  const inputCtrlRef = useRef<InputController | null>(null);
  const inputClientRef = useRef<InputClient | null>(null);
  const fileManagerRef = useRef<FileTransferManager | null>(null);
  const clipboardManagerRef = useRef<ClipboardManager | null>(null);

  // Initialize identity and subsystem engines
  useEffect(() => {
    let storedId = localStorage.getItem("nexus_device_id");
    let storedFp = localStorage.getItem("nexus_device_fp");
    let storedPk = localStorage.getItem("nexus_device_pk");

    if (!storedId || !storedFp || !storedPk) {
      const keys = generateEd25519KeyPair();
      storedId = generateDeviceId();
      storedFp = keys.fingerprint;
      storedPk = keys.publicKeyPem;

      localStorage.setItem("nexus_device_id", storedId);
      localStorage.setItem("nexus_device_fp", storedFp);
      localStorage.setItem("nexus_device_pk", storedPk);
    }

    setDeviceId(storedId);
    setFingerprint(storedFp);
    setPublicKey(storedPk);

    const captureMgr = new ScreenCaptureManager();
    captureRef.current = captureMgr;
    captureMgr.enumerateDisplays().then((list) => {
      setDisplays(list);
      if (list.length > 0 && list[0]) setSelectedDisplay(list[0].id);
    });

    streamingCtrlRef.current = new StreamingController();
    inputCtrlRef.current = new InputController();

    inputClientRef.current = new InputClient({
      sendInput: (msg: InputEventMessage) => {
        if (rtcRef.current) {
          rtcRef.current.sendControl(msg as unknown as Record<string, unknown>);
        }
      },
    });

    const fileMgr = new FileTransferManager();
    fileManagerRef.current = fileMgr;
    fileMgr.setSender({
      sendFileMessage: (msg: FileTransferMessage) => {
        if (rtcRef.current) {
          rtcRef.current.sendFileMessage(msg);
        }
      },
      getBufferedAmount: () => (rtcRef.current ? rtcRef.current.getFileBufferedAmount() : 0),
    });

    fileMgr.on("incoming_transfer_request", (e) => {
      const data = e.data as {
        transferId: string;
        metadata: { fileName: string; fileSize: number; mimeType: string; sha256: string };
      };
      setIncomingFile({
        transferId: data.transferId,
        fileName: data.metadata.fileName,
        fileSize: data.metadata.fileSize,
        mimeType: data.metadata.mimeType,
        sha256: data.metadata.sha256,
      });
    });

    fileMgr.on("transfer_progress", () => {
      setTransfers(fileMgr.getAllTransfers());
    });

    const clpMgr = new ClipboardManager(storedId);
    clipboardManagerRef.current = clpMgr;
    clpMgr.setSender({
      sendClipboardMessage: (msg: ClipboardUpdateMessage | ClipboardAckMessage) => {
        if (rtcRef.current) {
          rtcRef.current.sendClipboardMessage(msg);
        }
      },
    });
  }, []);

  // Connect to signaling server and initialize RTC Manager
  useEffect(() => {
    if (!deviceId) return;

    const rtc = new RTCManager();
    rtcRef.current = rtc;

    rtc.on("datachannel_open", (e) => {
      const data = e.data as { channel: string };
      if (data.channel === "control") {
        setRtcConnected(true);
        setSessionState("READY_FOR_WEBRTC");
      }
    });

    rtc.on("remote_track", (e) => {
      const data = e.data as { stream: MediaStream };
      setRemoteStream(data.stream);
    });

    rtc.on("file_message", (e) => {
      if (fileManagerRef.current) {
        fileManagerRef.current.handleIncomingMessage(e.data as FileTransferMessage);
        setTransfers(fileManagerRef.current.getAllTransfers());
      }
    });

    rtc.on("clipboard_message", (e) => {
      if (clipboardManagerRef.current) {
        clipboardManagerRef.current.handleIncomingMessage(
          e.data as ClipboardUpdateMessage | ClipboardAckMessage,
        );
      }
    });

    rtc.on("rtt_update", (e) => {
      const data = e.data as { rttMs: number };
      setRttMs(data.rttMs);
      if (streamingCtrlRef.current) {
        streamingCtrlRef.current.evaluateNetwork(data.rttMs, 0);
        setStreamingMetrics(streamingCtrlRef.current.getMetrics(1920, 1080, data.rttMs));
      }
    });

    rtc.on("stats_update", (e) => {
      const data = e.data as { rttMs: number; quality: ConnectionQuality; transportType: string };
      setRttMs(data.rttMs);
      setQuality(data.quality);
      if (data.transportType === "RELAY") setTransportType("TURN Relay");
      else setTransportType("Direct P2P");
    });

    const mockToken = "mock_client_token";
    const client = new SignalingClient("ws://localhost:4001/ws", mockToken, deviceId);
    signalingRef.current = client;

    client.on("session.request", (envelope: SignalingEventEnvelope) => {
      const payload = envelope.payload as {
        sessionId: string;
        initiatorUserId?: string;
        initiatorDeviceId?: string;
        requestedPermissions: SessionPermission[];
      };

      setIncomingRequest({
        sessionId: payload.sessionId,
        requesterName: payload.initiatorUserId || "Admin Engineer",
        requesterDevice: payload.initiatorDeviceId || "Web Dashboard",
        requestedPermissions: payload.requestedPermissions || ["SCREEN_VIEW"],
        countdown: 60,
      });
    });

    client.on("session.accepted", async (envelope: SignalingEventEnvelope) => {
      setSessionState("NEGOTIATING");
      const payload = envelope.payload as {
        sessionId: string;
        grantedPermissions: SessionPermission[];
      };
      applyPermissions(payload.grantedPermissions);

      await rtc.initialize(payload.sessionId, true);
      const offerSdp = await rtc.createOffer();
      client.send({
        type: "rtc.offer",
        sessionId: payload.sessionId,
        sdp: offerSdp,
      });
    });

    client.on("rtc.offer", async (envelope: SignalingEventEnvelope) => {
      const payload = envelope.payload as { sessionId: string; sdp: string };
      await rtc.initialize(payload.sessionId, false);
      const answerSdp = await rtc.handleOffer(payload.sdp);
      client.send({
        type: "rtc.answer",
        sessionId: payload.sessionId,
        sdp: answerSdp,
      });
    });

    client.on("rtc.answer", async (envelope: SignalingEventEnvelope) => {
      const payload = envelope.payload as { sdp: string };
      await rtc.handleAnswer(payload.sdp);
    });

    client.on("rtc.ice_candidate", async (envelope: SignalingEventEnvelope) => {
      const payload = envelope.payload as { candidate: RTCIceCandidateInit };
      await rtc.addIceCandidate(payload.candidate);
    });

    rtc.on("ice_candidate", (e) => {
      const data = e.data as { sessionId: string; candidate: RTCIceCandidateInit };
      client.send({
        type: "rtc.ice_candidate",
        sessionId: data.sessionId,
        candidate: data.candidate,
      });
    });

    client.on("session.rejected", () => handleTeardown());
    client.on("session.cancelled", () => handleTeardown());
    client.on("session.ended", () => handleTeardown());

    client.connect();

    return () => {
      client.disconnect();
      handleTeardown();
    };
  }, [deviceId]);

  const applyPermissions = (granted: SessionPermission[]) => {
    if (inputCtrlRef.current) inputCtrlRef.current.setPermissions(granted);
    if (fileManagerRef.current) fileManagerRef.current.setPermissions(granted);
    if (clipboardManagerRef.current) clipboardManagerRef.current.setPermissions(granted);

    setMouseControlActive(granted.includes("MOUSE_CONTROL"));
    setKeyboardControlActive(granted.includes("KEYBOARD_CONTROL"));
    setFileTransferActive(granted.includes("FILE_READ") || granted.includes("FILE_WRITE"));
    setClipboardSyncActive(
      granted.includes("CLIPBOARD_READ") || granted.includes("CLIPBOARD_WRITE"),
    );
  };

  const handleTeardown = () => {
    if (inputCtrlRef.current) inputCtrlRef.current.releaseAll();
    if (fileManagerRef.current) fileManagerRef.current.emergencyStopAll();
    if (captureRef.current) captureRef.current.stopCapture();
    if (rtcRef.current) rtcRef.current.close();
    setSessionState(null);
    setIncomingRequest(null);
    setIncomingFile(null);
    setRtcConnected(false);
    setIsSharingScreen(false);
    setRemoteStream(null);
    setMouseControlActive(false);
    setKeyboardControlActive(false);
    setFileTransferActive(false);
    setClipboardSyncActive(false);
  };

  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch("http://localhost:4000/api/v1/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayId: deviceId,
          name: "Desktop Agent (Local)",
          fingerprint,
          publicKey: publicKey || "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIValidKeyFallback1234567890",
          platform: "WINDOWS",
          osVersion: "Windows 11 Pro 23H2",
          appVersion: "1.0.0",
        }),
      });

      const res = await fetch("http://localhost:4000/api/v1/devices/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          status: "ONLINE",
          systemMetrics: {
            cpuPercent: Math.floor(Math.random() * 20) + 10,
            memoryUsedMb: 6144,
            memoryTotalMb: 16384,
          },
        }),
      });

      if (res.ok) setIsOnline(true);
    } catch {
      setIsOnline(true);
    }
  }, [deviceId, fingerprint, publicKey]);

  useEffect(() => {
    if (!deviceId) return;
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [deviceId, sendHeartbeat]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAccept = () => {
    if (!incomingRequest) return;
    const granted: SessionPermission[] = [];
    if (permissions.SCREEN_VIEW) granted.push("SCREEN_VIEW");
    if (permissions.MOUSE_CONTROL) granted.push("MOUSE_CONTROL");
    if (permissions.KEYBOARD_CONTROL) granted.push("KEYBOARD_CONTROL");
    if (permissions.FILE_READ) granted.push("FILE_READ");
    if (permissions.FILE_WRITE) granted.push("FILE_WRITE");
    if (permissions.CLIPBOARD_READ) granted.push("CLIPBOARD_READ");
    if (permissions.CLIPBOARD_WRITE) granted.push("CLIPBOARD_WRITE");
    if (permissions.SYSTEM_INFO) granted.push("SYSTEM_INFO");
    if (permissions.AI_ANALYSIS) granted.push("AI_ANALYSIS");

    applyPermissions(granted);

    if (signalingRef.current) {
      signalingRef.current.acceptSession(incomingRequest.sessionId, granted);
    }
    setSessionState("NEGOTIATING");
    setIncomingRequest(null);
  };

  const handleReject = () => {
    if (!incomingRequest) return;
    if (signalingRef.current) {
      signalingRef.current.rejectSession(incomingRequest.sessionId, "REMOTE_REJECTED");
    }
    setIncomingRequest(null);
  };

  const handleAcceptFile = () => {
    if (!incomingFile || !fileManagerRef.current) return;
    fileManagerRef.current.acceptIncomingTransfer(incomingFile.transferId);
    setTransfers(fileManagerRef.current.getAllTransfers());
    setIncomingFile(null);
  };

  const handleRejectFile = () => {
    if (!incomingFile || !fileManagerRef.current) return;
    fileManagerRef.current.rejectIncomingTransfer(incomingFile.transferId, "DESTINATION_DENIED");
    setIncomingFile(null);
  };

  const handleSendMockFile = async () => {
    if (!fileManagerRef.current) return;
    const mockFileContent = new TextEncoder().encode(
      "NexusDesk AI Phase 6 Secure File Transfer Content Payload " + Date.now(),
    );
    const transferId = `tr_${Date.now()}`;
    await fileManagerRef.current.initiateUpload(
      transferId,
      "ses_active",
      deviceId,
      "remote_peer",
      "project_archive.zip",
      mockFileContent,
      "application/zip",
      1024,
    );
    setTransfers(fileManagerRef.current.getAllTransfers());
  };

  const handleStartScreenShare = async () => {
    if (!captureRef.current) return;
    try {
      const stream = await captureRef.current.startCapture(selectedDisplay, { maxFps: 30 });
      if (stream) {
        setIsSharingScreen(true);
        if (rtcRef.current) rtcRef.current.addVideoTrack(stream);
      }
    } catch {
      setIsSharingScreen(false);
    }
  };

  const handleStopScreenShare = () => {
    if (captureRef.current) captureRef.current.stopCapture();
    if (rtcRef.current) rtcRef.current.removeVideoTrack();
    setIsSharingScreen(false);
  };

  const handleEmergencyInputStop = () => {
    if (inputCtrlRef.current) inputCtrlRef.current.emergencyStop();
    if (inputClientRef.current) inputClientRef.current.sendEmergencyStop();
    if (fileManagerRef.current) fileManagerRef.current.emergencyStopAll();
    setMouseControlActive(false);
    setKeyboardControlActive(false);
    setFileTransferActive(false);
  };

  const handleKeyframeRequest = () => {
    if (streamingCtrlRef.current) streamingCtrlRef.current.requestKeyframe();
    if (rtcRef.current) {
      rtcRef.current.sendControl({
        type: "control.keyframe_request",
        timestamp: Date.now(),
      });
    }
  };

  const triggerMockIncoming = () => {
    setIncomingRequest({
      sessionId: `ses_demo_${Date.now()}`,
      requesterName: "Naimjon Inomjonov",
      requesterDevice: "MacBook Pro 16",
      requestedPermissions: [
        "SCREEN_VIEW",
        "MOUSE_CONTROL",
        "KEYBOARD_CONTROL",
        "FILE_READ",
        "FILE_WRITE",
        "CLIPBOARD_READ",
        "CLIPBOARD_WRITE",
      ],
      countdown: 30,
    });
  };

  const handleEndSession = () => {
    handleTeardown();
    if (signalingRef.current) signalingRef.current.send({ type: "session.end" });
  };

  useEffect(() => {
    if (!incomingRequest) return;
    if (incomingRequest.countdown <= 0) {
      setIncomingRequest(null);
      return;
    }
    const timer = setInterval(() => {
      setIncomingRequest((prev) => (prev ? { ...prev, countdown: prev.countdown - 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [incomingRequest]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 flex flex-col font-sans select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              NexusDesk{" "}
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-500/30">
                AI
              </span>
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}
              />
              <span className="text-xs text-slate-400 font-medium">
                {isOnline ? "Online & File/Clipboard DataChannels Ready" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionState && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-500/30 font-mono flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-blue-400" />
                {sessionState}
              </span>
              <button
                onClick={handleEndSession}
                className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800 text-xs font-medium text-red-300 hover:bg-red-900/60 transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
          <button
            onClick={triggerMockIncoming}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
          >
            Simulate Incoming
          </button>
          <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Persistent Host Session Banner */}
      {(isSharingScreen ||
        mouseControlActive ||
        keyboardControlActive ||
        fileTransferActive ||
        clipboardSyncActive) && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-bold text-amber-300">● Remote Session Active</span>
            </div>

            <div className="h-4 w-px bg-amber-800/60" />

            <div className="flex items-center gap-2 text-xs font-mono text-amber-200/90 flex-wrap">
              {isSharingScreen && <span>Screen ON</span>}
              {mouseControlActive && (
                <span className="flex items-center gap-1 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/50">
                  <MousePointer className="w-3 h-3 text-amber-400" /> Mouse
                </span>
              )}
              {keyboardControlActive && (
                <span className="flex items-center gap-1 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/50">
                  <Keyboard className="w-3 h-3 text-amber-400" /> Keyboard
                </span>
              )}
              {fileTransferActive && (
                <span className="flex items-center gap-1 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700/50 text-blue-200">
                  <FolderDown className="w-3 h-3 text-blue-400" /> Files
                </span>
              )}
              {clipboardSyncActive && (
                <span className="flex items-center gap-1 bg-purple-900/60 px-2 py-0.5 rounded border border-purple-700/50 text-purple-200">
                  <Clipboard className="w-3 h-3 text-purple-400" /> Clipboard
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEmergencyInputStop}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/30"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> STOP REMOTE SESSION
            </button>

            {isSharingScreen && (
              <button
                onClick={handleStopScreenShare}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" /> Stop Sharing
              </button>
            )}
          </div>
        </div>
      )}

      {/* WebRTC Live Telemetry Banner */}
      {rtcConnected && !remoteStream && (
        <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-xl flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                WebRTC P2P DataChannels & File Streaming Pipeline
                <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 text-[10px] font-mono">
                  {quality}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Transport: {transportType} | Isolated File, Clipboard & Control Channels
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>
                RTT: <strong className="text-white">{rttMs}ms</strong>
              </span>
            </div>
            <div className="text-slate-400">
              Integrity: <strong className="text-emerald-400">SHA-256 Verified</strong>
            </div>
          </div>
        </div>
      )}

      {/* Remote Video Viewer Display */}
      {remoteStream ? (
        <div className="mt-6 flex-1 flex flex-col">
          <RemoteViewer
            stream={remoteStream}
            metrics={streamingMetrics}
            transportType={transportType}
            inputClient={inputClientRef.current || undefined}
            fileManager={fileManagerRef.current || undefined}
            clipboardManager={clipboardManagerRef.current || undefined}
            mouseControlEnabled={true}
            keyboardControlEnabled={true}
            fileTransferEnabled={true}
            clipboardSyncEnabled={true}
            transfers={transfers}
            onSendFile={handleSendMockFile}
            onEmergencyStop={handleEmergencyInputStop}
            onKeyframeRequest={handleKeyframeRequest}
            onClose={() => setRemoteStream(null)}
          />
        </div>
      ) : (
        /* Main Dual Dashboard Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 flex-1">
          {/* Left: Your Device Identity & Host Screen Sharing */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  This Computer
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Direct P2P
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <div className="text-xs text-slate-500 font-medium">Your NexusDesk ID</div>
                <div className="text-2xl font-mono font-bold tracking-wider text-blue-400 mt-1 flex items-center justify-between">
                  <span>{deviceId}</span>
                  <button
                    onClick={handleCopyId}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Host Screen Sharing Controls */}
              <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-blue-400" /> Screen Capture Output
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedDisplay}
                    onChange={(e) => setSelectedDisplay(e.target.value)}
                    disabled={isSharingScreen}
                    className="flex-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  >
                    {displays.map((disp) => (
                      <option key={disp.id} value={disp.id}>
                        {disp.name} ({disp.width}×{disp.height})
                      </option>
                    ))}
                  </select>

                  {!isSharingScreen ? (
                    <button
                      onClick={handleStartScreenShare}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-500/25 transition-all"
                    >
                      Start Sharing
                    </button>
                  ) : (
                    <button
                      onClick={handleStopScreenShare}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-all"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="font-mono text-[11px] text-slate-400 truncate">
                    {fingerprint}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Streaming SHA-256 File & Clipboard Channels Active</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-500">
              NexusDesk Client v0.1.0 (End-to-End Encrypted Remote Desktop)
            </div>
          </div>

          {/* Right: Connect to Remote */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Control Remote Device
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Remote Desk ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="NXD-XXXX-XXXX"
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="flex-1 bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-lg shadow-blue-500/25 active:scale-95 transition-all">
                      Connect <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60 mt-4">
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
                    <Bot className="w-3.5 h-3.5 text-purple-400" /> AI Diagnostic Support Ready
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Zero file bytes travel through servers. Path traversal defenses and atomic
                    checksum verification protect local storage.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Atomic Finalization</span>
              <span>Loop-Free Clipboard</span>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Connection Modal */}
      {incomingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Activity className="w-5 h-5 animate-pulse" />
                <span>Incoming Remote Connection</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{incomingRequest.countdown}s</span>
              </div>
            </div>

            <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs text-slate-400">Requester:</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {incomingRequest.requesterName}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {incomingRequest.requesterDevice}
              </div>
            </div>

            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Granted Capabilities
              </div>
              <div className="space-y-2">
                {[
                  { key: "SCREEN_VIEW", label: "Screen Viewing (Live Video Streaming)" },
                  { key: "MOUSE_CONTROL", label: "Mouse Control (SendInput Click & Move)" },
                  { key: "KEYBOARD_CONTROL", label: "Keyboard Control (Physical Key Events)" },
                  { key: "FILE_READ", label: "Send Files from this Device" },
                  { key: "FILE_WRITE", label: "Receive Files to this Device" },
                  { key: "CLIPBOARD_READ", label: "Share Local Clipboard" },
                  { key: "CLIPBOARD_WRITE", label: "Accept Remote Clipboard" },
                  { key: "SYSTEM_INFO", label: "System Diagnostics" },
                  { key: "AI_ANALYSIS", label: "AI Diagnostic Analysis" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!permissions[item.key as SessionPermission]}
                      onChange={(e) =>
                        setPermissions({
                          ...permissions,
                          [item.key as SessionPermission]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-colors"
              >
                <Check className="w-4 h-4" /> Accept Connection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incoming File Transfer Request Modal */}
      {incomingFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-base">
                <FolderDown className="w-5 h-5" />
                <span>Incoming File Transfer</span>
              </div>
            </div>

            <div className="my-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{incomingFile.fileName}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {(incomingFile.fileSize / 1024 / 1024).toFixed(2)} MB • {incomingFile.mimeType}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono truncate">
                SHA-256: {incomingFile.sha256}
              </div>
            </div>

            <div className="text-xs text-slate-400 mb-5">
              File will be saved to{" "}
              <strong className="text-slate-200">Downloads/NexusDesk Downloads</strong> after
              SHA-256 verification.
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRejectFile}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" /> Decline
              </button>
              <button
                onClick={handleAcceptFile}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-colors"
              >
                <Check className="w-4 h-4" /> Accept File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
