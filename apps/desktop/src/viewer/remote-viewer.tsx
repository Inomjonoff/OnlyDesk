import { useRef, useEffect, useState, useCallback } from "react";
import {
  Maximize2,
  Minimize2,
  Monitor,
  Eye,
  MousePointer,
  Keyboard,
  ShieldAlert,
  FolderDown,
  Clipboard,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
  Video,
  Send,
  Square,
  Bot,
} from "lucide-react";
import {
  StreamingMetrics,
  MouseButtonType,
  ViewerScalingMode,
  FileTransferProgress,
  ChatMessagePayload,
  RecordingMetadata,
} from "@nexusdesk/types";
import { InputClient } from "../input/input-client";
import { ContainerRect } from "../input/coordinate-mapper";
import { FileTransferManager } from "../files/file-transfer-manager";
import { ClipboardManager } from "../clipboard/clipboard-manager";
import { ChatClient } from "../chat/chat-client";
import { ScreenRecorder } from "../recording/screen-recorder";
import { AICopilotPanel } from "../ai/components/ai-copilot-panel";
import { AiActionProposal, AiMessage } from "@nexusdesk/types";

interface RemoteViewerProps {
  stream: MediaStream | null;
  metrics: StreamingMetrics;
  transportType?: string;
  inputClient?: InputClient;
  fileManager?: FileTransferManager;
  clipboardManager?: ClipboardManager;
  chatClient?: ChatClient;
  screenRecorder?: ScreenRecorder;
  mouseControlEnabled?: boolean;
  keyboardControlEnabled?: boolean;
  fileTransferEnabled?: boolean;
  clipboardSyncEnabled?: boolean;
  isRecordingActive?: boolean;
  recordingMetadata?: RecordingMetadata | null;
  transfers?: FileTransferProgress[];
  chatMessages?: ChatMessagePayload[];
  aiMessages?: AiMessage[];
  pendingAiProposals?: AiActionProposal[];
  onKeyframeRequest?: () => void;
  onEmergencyStop?: () => void;
  onSendFile?: () => void;
  onSendMessage?: (text: string) => void;
  onSendAiMessage?: (text: string) => Promise<void>;
  onAnalyzeScreen?: () => Promise<void>;
  onApproveAiProposal?: (id: string) => Promise<void>;
  onRejectAiProposal?: (id: string) => Promise<void>;
  onToggleRecording?: () => void;
  onClose?: () => void;
}

export function RemoteViewer({
  stream,
  metrics,
  transportType = "Direct P2P",
  inputClient,
  chatClient,
  mouseControlEnabled = true,
  keyboardControlEnabled = true,
  fileTransferEnabled = true,
  clipboardSyncEnabled = true,
  isRecordingActive = false,
  recordingMetadata,
  transfers = [],
  chatMessages = [],
  aiMessages = [],
  pendingAiProposals = [],
  onKeyframeRequest,
  onEmergencyStop,
  onSendFile,
  onSendMessage,
  onSendAiMessage,
  onAnalyzeScreen,
  onApproveAiProposal,
  onRejectAiProposal,
  onToggleRecording,
  onClose,
}: RemoteViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const [scalingMode, setScalingMode] = useState<ViewerScalingMode>("contain");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [hasInputFocus, setHasInputFocus] = useState(false);
  const [activePanel, setActivePanel] = useState<
    "files" | "clipboard" | "chat" | "recording" | "ai" | null
  >(null);
  const [chatInputText, setChatInputText] = useState("");
  const [isAiEmergencyStopped, setIsAiEmergencyStopped] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (activePanel === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activePanel]);

  const getContainerRect = useCallback((): ContainerRect => {
    if (!containerRef.current) return { left: 0, top: 0, width: 1920, height: 1080 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!inputClient || !mouseControlEnabled) return;
    inputClient.handleMouseMove(
      e.clientX,
      e.clientY,
      getContainerRect(),
      metrics.width || 1920,
      metrics.height || 1080,
      scalingMode,
    );
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!inputClient || !mouseControlEnabled) return;
    let button: MouseButtonType = "LEFT";
    if (e.button === 2) button = "RIGHT";
    else if (e.button === 1) button = "MIDDLE";

    inputClient.handleMouseButton(
      button,
      "DOWN",
      e.clientX,
      e.clientY,
      getContainerRect(),
      metrics.width || 1920,
      metrics.height || 1080,
      scalingMode,
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!inputClient || !mouseControlEnabled) return;
    let button: MouseButtonType = "LEFT";
    if (e.button === 2) button = "RIGHT";
    else if (e.button === 1) button = "MIDDLE";

    inputClient.handleMouseButton(
      button,
      "UP",
      e.clientX,
      e.clientY,
      getContainerRect(),
      metrics.width || 1920,
      metrics.height || 1080,
      scalingMode,
    );
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!inputClient || !mouseControlEnabled) return;
    inputClient.handleMouseWheel(
      e.deltaX,
      e.deltaY,
      e.clientX,
      e.clientY,
      getContainerRect(),
      metrics.width || 1920,
      metrics.height || 1080,
      scalingMode,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!inputClient || !keyboardControlEnabled || activePanel === "chat") return;
    if (e.key === "Tab" || e.key === "Alt" || (e.ctrlKey && e.key.toLowerCase() === "r")) {
      e.preventDefault();
    }

    inputClient.handleKeyboard(
      e.code,
      e.key,
      "DOWN",
      {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
      },
      e.repeat,
    );
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (!inputClient || !keyboardControlEnabled || activePanel === "chat") return;

    inputClient.handleKeyboard(
      e.code,
      e.key,
      "UP",
      {
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
      },
      false,
    );
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputText.trim()) return;

    if (onSendMessage) {
      onSendMessage(chatInputText);
    } else if (chatClient) {
      chatClient.sendMessage(chatInputText);
    }
    setChatInputText("");
  };

  const getObjectFitStyle = (): string => {
    switch (scalingMode) {
      case "contain":
        return "object-contain w-full h-full";
      case "cover":
        return "object-cover w-full h-full";
      case "fit":
        return "object-fill w-full h-full";
      case "100%":
        return "w-auto h-auto max-w-none";
      default:
        return "object-contain w-full h-full";
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onFocus={() => setHasInputFocus(true)}
      onBlur={() => setHasInputFocus(false)}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full min-h-[540px] bg-black flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 shadow-2xl select-none outline-none cursor-crosshair"
    >
      {/* Video Surface */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`transition-all duration-150 pointer-events-none ${getObjectFitStyle()}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500 gap-3 pointer-events-none">
          <Monitor className="w-12 h-12 stroke-[1.5] text-slate-600 animate-pulse" />
          <div className="text-sm font-medium">Waiting for remote desktop screen stream...</div>
          <div className="text-xs text-slate-600 font-mono">WebRTC Video Track Standby</div>
        </div>
      )}

      {/* Floating HUD Telemetry & Capability Control Bar */}
      {showHUD && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between p-3 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-2xl z-20 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                Live Desktop Stream
              </span>
            </div>

            {/* Persistent Recording Indicator */}
            {isRecordingActive && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-700/60 animate-pulse font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                RECORDING
                {onToggleRecording && (
                  <button
                    onClick={onToggleRecording}
                    className="ml-1 p-0.5 hover:text-white transition-colors"
                    title="Stop Recording"
                  >
                    <Square className="w-2.5 h-2.5 fill-current" />
                  </button>
                )}
              </div>
            )}

            <div className="h-4 w-px bg-slate-800" />

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span
                className={`px-2 py-0.5 rounded flex items-center gap-1 border ${
                  mouseControlEnabled
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/50"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                <MousePointer className="w-3 h-3" /> Mouse: {mouseControlEnabled ? "ON" : "OFF"}
              </span>

              <span
                className={`px-2 py-0.5 rounded flex items-center gap-1 border ${
                  keyboardControlEnabled
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-800/50"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                <Keyboard className="w-3 h-3" /> Keyboard: {keyboardControlEnabled ? "ON" : "OFF"}
              </span>

              <button
                onClick={() => setActivePanel(activePanel === "files" ? null : "files")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 border transition-colors ${
                  fileTransferEnabled
                    ? "bg-blue-950/80 text-blue-300 border-blue-800/50 hover:bg-blue-900/80"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                <FolderDown className="w-3 h-3" /> Files
                {transfers.length > 0 && (
                  <span className="ml-1 px-1 bg-blue-500 text-slate-950 rounded-full font-bold text-[9px]">
                    {transfers.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActivePanel(activePanel === "clipboard" ? null : "clipboard")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 border transition-colors ${
                  clipboardSyncEnabled
                    ? "bg-purple-950/80 text-purple-300 border-purple-800/50 hover:bg-purple-900/80"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                <Clipboard className="w-3 h-3" /> Clipboard
              </button>

              <button
                onClick={() => setActivePanel(activePanel === "chat" ? null : "chat")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 border transition-colors ${
                  activePanel === "chat"
                    ? "bg-cyan-950/90 text-cyan-300 border-cyan-700/60"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3 h-3" /> Chat
                {chatMessages.length > 0 && (
                  <span className="ml-1 px-1 bg-cyan-500 text-slate-950 rounded-full font-bold text-[9px]">
                    {chatMessages.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActivePanel(activePanel === "recording" ? null : "recording")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 border transition-colors ${
                  isRecordingActive
                    ? "bg-rose-950/80 text-rose-300 border-rose-800/50"
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <Video className="w-3 h-3" /> Record
              </button>

              <button
                onClick={() => setActivePanel(activePanel === "ai" ? null : "ai")}
                className={`px-2 py-0.5 rounded flex items-center gap-1 border transition-colors ${
                  activePanel === "ai"
                    ? "bg-indigo-950/90 text-indigo-300 border-indigo-700/60"
                    : "bg-slate-900 text-indigo-400 border-slate-800 hover:text-indigo-300 hover:bg-slate-850"
                }`}
              >
                <Bot className="w-3 h-3" /> AI Copilot
                {pendingAiProposals.length > 0 && (
                  <span className="ml-1 px-1 bg-amber-500 text-slate-950 rounded-full font-bold text-[9px] animate-pulse">
                    {pendingAiProposals.length}
                  </span>
                )}
              </button>

              {hasInputFocus && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
                  Focused
                </span>
              )}

              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {transportType}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <select
              value={scalingMode}
              onChange={(e) => setScalingMode(e.target.value as ViewerScalingMode)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px] outline-none"
            >
              <option value="contain">Contain (Aspect)</option>
              <option value="cover">Cover (Crop)</option>
              <option value="fit">Fit Stretch</option>
              <option value="100%">100% Original</option>
            </select>

            {onEmergencyStop && (
              <button
                onClick={onEmergencyStop}
                className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 flex items-center gap-1 font-bold transition-all shadow-lg text-[11px]"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Stop Input & Sync
              </button>
            )}

            {onKeyframeRequest && (
              <button
                onClick={onKeyframeRequest}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Request Keyframe"
              >
                <Monitor className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowHUD(!showHUD)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Toggle HUD"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                Exit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Slide-out Drawers */}
      {/* 1. Chat Drawer */}
      {activePanel === "chat" && (
        <div className="absolute right-4 top-20 bottom-4 w-96 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-30 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-sm font-bold text-white">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" /> Session Chat
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 font-sans">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-500 text-xs py-12">
                No chat messages yet. Start the conversation!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isSystem = msg.type === "SYSTEM";
                return (
                  <div
                    key={msg.messageId}
                    className={`flex flex-col ${isSystem ? "items-center" : "items-start"} text-xs`}
                  >
                    {isSystem ? (
                      <div className="px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[10px] text-center my-1 font-mono">
                        {msg.text}
                      </div>
                    ) : (
                      <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-bold text-slate-300">{msg.senderName}</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-200 text-xs whitespace-pre-wrap break-words">
                          {msg.text}
                        </div>
                        {msg.deliveryState && (
                          <div className="text-[9px] text-slate-500 text-right font-mono">
                            {msg.deliveryState}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          <form
            onSubmit={handleSendChatMessage}
            className="pt-2 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={chatInputText}
              onChange={(e) => setChatInputText(e.target.value)}
              placeholder="Type message... (Enter to send)"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInputText.trim()}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}

      {/* 2. Recording Drawer */}
      {activePanel === "recording" && (
        <div className="absolute right-4 top-20 bottom-4 w-96 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-30 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-sm font-bold text-white">
            <span className="flex items-center gap-2">
              <Video className="w-4 h-4 text-rose-400" /> Screen Recording
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs font-mono">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="text-slate-400 font-sans font-bold">Status:</div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRecordingActive ? "bg-rose-500 animate-pulse" : "bg-slate-600"
                  }`}
                />
                <span className="font-bold text-white">
                  {isRecordingActive ? "RECORDING ACTIVE" : "STANDBY"}
                </span>
              </div>
              <div className="text-slate-500 text-[11px]">Format: H.264 / MP4 (1080p @ 30fps)</div>
              <div className="text-slate-500 text-[11px]">Audio: None (Video stream only)</div>
            </div>

            {recordingMetadata && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-400">
                <div>ID: {recordingMetadata.recordingId}</div>
                <div>Duration: {Math.round(recordingMetadata.durationMs / 1000)}s</div>
                <div>Size: {(recordingMetadata.fileSize / 1024).toFixed(1)} KB</div>
                {recordingMetadata.sha256 && (
                  <div className="break-all text-[10px] text-emerald-400">
                    SHA-256: {recordingMetadata.sha256.substring(0, 16)}...
                  </div>
                )}
              </div>
            )}

            {onToggleRecording && (
              <button
                onClick={onToggleRecording}
                className={`w-full py-2.5 rounded-xl font-bold font-sans transition-colors flex items-center justify-center gap-2 ${
                  isRecordingActive
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {isRecordingActive ? (
                  <>
                    <Square className="w-4 h-4 fill-current" /> Stop Recording
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" /> Start Recording
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Files Drawer */}
      {activePanel === "files" && (
        <div className="absolute right-4 top-20 bottom-4 w-96 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-30 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-sm font-bold text-white">
            <span className="flex items-center gap-2">
              <FolderDown className="w-4 h-4 text-blue-400" /> Active File Transfers
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3 font-mono text-xs">
            {transfers.length === 0 ? (
              <div className="text-center text-slate-500 py-12">No active file transfers.</div>
            ) : (
              transfers.map((t) => (
                <div
                  key={t.transferId}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="font-bold truncate max-w-[180px] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" /> {t.fileName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(t.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-blue-500 h-full transition-all duration-200"
                      style={{ width: `${t.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{t.progressPercent}%</span>
                    <span>{(t.speedBytesPerSec / 1024 / 1024).toFixed(1)} MB/s</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {t.etaSeconds}s
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {onSendFile && (
            <button
              onClick={onSendFile}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload File to Remote
            </button>
          )}
        </div>
      )}

      {/* 4. Clipboard Drawer */}
      {activePanel === "clipboard" && (
        <div className="absolute right-4 top-20 bottom-4 w-80 bg-slate-950/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-30 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-sm font-bold text-white">
            <span className="flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-purple-400" /> Clipboard Sync
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 py-4 space-y-3 text-xs text-slate-300 font-mono">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1.5">
              <div className="text-slate-400 font-sans font-bold">Sync Mode: Automatic</div>
              <div>Text: Max 1 MiB UTF-8</div>
              <div>Image: Max 10 MiB PNG</div>
              <div className="text-emerald-400 text-[10px] flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3 h-3" /> Loop Prevention Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. AI Copilot Drawer */}
      {activePanel === "ai" && (
        <div className="absolute right-4 top-20 bottom-4 z-30 rounded-2xl overflow-hidden shadow-2xl">
          <AICopilotPanel
            sessionId="session_active"
            messages={aiMessages}
            pendingProposals={pendingAiProposals}
            onSendMessage={async (text) => {
              if (onSendAiMessage) await onSendAiMessage(text);
            }}
            onAnalyzeScreen={async () => {
              if (onAnalyzeScreen) await onAnalyzeScreen();
            }}
            onApproveProposal={async (id) => {
              if (onApproveAiProposal) await onApproveAiProposal(id);
            }}
            onRejectProposal={async (id) => {
              if (onRejectAiProposal) await onRejectAiProposal(id);
            }}
            onEmergencyStop={() => {
              setIsAiEmergencyStopped(!isAiEmergencyStopped);
              if (onEmergencyStop) onEmergencyStop();
            }}
            isEmergencyStopped={isAiEmergencyStopped}
          />
        </div>
      )}
    </div>
  );
}
