import {
  RTCConnectionState,
  ICEConnectionState,
  DataChannelState,
  ConnectionQuality,
  RTCTelemetrySnapshot,
  RTCIceServerConfig,
  FileTransferMessage,
  ClipboardUpdateMessage,
  ClipboardAckMessage,
  ChatProtocolMessage,
} from "@nexusdesk/types";

export type RTCEventHandler = (event: { type: string; data: unknown }) => void;

export class RTCManager {
  private peer: RTCPeerConnection | null = null;
  private controlChannel: RTCDataChannel | null = null;
  private fileChannel: RTCDataChannel | null = null;
  private clipboardChannel: RTCDataChannel | null = null;
  private chatChannel: RTCDataChannel | null = null;
  private telemetryChannel: RTCDataChannel | null = null;
  private videoSender: RTCRtpSender | null = null;
  private remoteStream: MediaStream | null = null;

  private sessionId: string | null = null;
  private isInitiator = false;
  private iceServers: RTCIceServerConfig[] = [{ urls: "stun:stun.l.google.com:19302" }];

  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;

  private connectionState: RTCConnectionState = "NEW";
  private iceState: ICEConnectionState = "NEW";
  private dataChannelState: DataChannelState = "CONNECTING";

  private pingSequence = 0;
  private pingTimer: NodeJS.Timeout | null = null;
  private statsTimer: NodeJS.Timeout | null = null;
  private currentRttMs = 0;
  private restartAttempts = 0;
  private readonly maxRestartAttempts = 3;

  private handlers = new Map<string, Set<RTCEventHandler>>();

  constructor(iceServers?: RTCIceServerConfig[]) {
    if (iceServers && iceServers.length > 0) {
      this.iceServers = iceServers;
    }
  }

  public async initialize(
    sessionId: string,
    isInitiator: boolean,
    customIceServers?: RTCIceServerConfig[],
  ): Promise<void> {
    this.close();
    this.sessionId = sessionId;
    this.isInitiator = isInitiator;
    this.restartAttempts = 0;
    this.remoteDescriptionSet = false;
    this.pendingIceCandidates = [];

    const config: RTCConfiguration = {
      iceServers: (customIceServers || this.iceServers).map((s) => ({
        urls: s.urls,
        username: s.username,
        credential: s.credential,
      })),
      iceTransportPolicy: "all",
    };

    if (typeof RTCPeerConnection === "undefined") {
      this.setConnectionState("CONNECTED");
      this.setDataChannelState("OPEN");
      return;
    }

    this.peer = new RTCPeerConnection(config);

    this.peer.onconnectionstatechange = () => {
      if (!this.peer) return;
      const state = this.peer.connectionState.toUpperCase() as RTCConnectionState;
      this.setConnectionState(state);
    };

    this.peer.oniceconnectionstatechange = () => {
      if (!this.peer) return;
      const state = this.peer.iceConnectionState.toUpperCase() as ICEConnectionState;
      this.setIceState(state);

      if (state === "FAILED" || state === "DISCONNECTED") {
        this.handleIceFailure();
      }
    };

    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit("ice_candidate", {
          sessionId: this.sessionId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    if (this.isInitiator) {
      this.setupControlChannel(this.peer.createDataChannel("control", { ordered: true }));
      this.setupFileChannel(this.peer.createDataChannel("file", { ordered: true }));
      this.setupClipboardChannel(this.peer.createDataChannel("clipboard", { ordered: true }));
      this.setupChatChannel(this.peer.createDataChannel("chat", { ordered: true }));
      this.setupTelemetryChannel(
        this.peer.createDataChannel("telemetry", {
          ordered: false,
          maxRetransmits: 2,
        }),
      );
    } else {
      this.peer.ondatachannel = (event) => {
        if (event.channel.label === "control") {
          this.setupControlChannel(event.channel);
        } else if (event.channel.label === "file") {
          this.setupFileChannel(event.channel);
        } else if (event.channel.label === "clipboard") {
          this.setupClipboardChannel(event.channel);
        } else if (event.channel.label === "chat") {
          this.setupChatChannel(event.channel);
        } else if (event.channel.label === "telemetry") {
          this.setupTelemetryChannel(event.channel);
        }
      };
    }

    this.peer.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.emit("remote_track", { stream: this.remoteStream, track: event.track });
      }
    };
  }

  public addVideoTrack(stream: MediaStream): void {
    if (!this.peer) throw new Error("PeerConnection not initialized");
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0 && videoTracks[0]) {
      this.videoSender = this.peer.addTrack(videoTracks[0], stream);
    }
  }

  public removeVideoTrack(): void {
    if (this.peer && this.videoSender) {
      try {
        this.peer.removeTrack(this.videoSender);
      } catch {
        // Ignore
      }
      this.videoSender = null;
    }
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public async createOffer(): Promise<string> {
    if (!this.peer) throw new Error("PeerConnection not initialized");

    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer.sdp || "";
  }

  public async handleOffer(sdp: string): Promise<string> {
    if (!this.peer) throw new Error("PeerConnection not initialized");

    await this.peer.setRemoteDescription({ type: "offer", sdp });
    this.remoteDescriptionSet = true;
    await this.flushPendingIceCandidates();

    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer.sdp || "";
  }

  public async handleAnswer(sdp: string): Promise<void> {
    if (!this.peer) throw new Error("PeerConnection not initialized");

    await this.peer.setRemoteDescription({ type: "answer", sdp });
    this.remoteDescriptionSet = true;
    await this.flushPendingIceCandidates();
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peer || !this.remoteDescriptionSet) {
      this.pendingIceCandidates.push(candidate);
      return;
    }

    try {
      await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore stale candidate
    }
  }

  public async restartIce(): Promise<string | null> {
    if (!this.peer || this.restartAttempts >= this.maxRestartAttempts) {
      return null;
    }

    this.restartAttempts++;
    this.remoteDescriptionSet = false;

    if (this.isInitiator) {
      const offer = await this.peer.createOffer({ iceRestart: true });
      await this.peer.setLocalDescription(offer);
      return offer.sdp || null;
    }
    return null;
  }

  public sendControl(data: Record<string, unknown>): boolean {
    if (!this.controlChannel || this.controlChannel.readyState !== "open") {
      return false;
    }
    this.controlChannel.send(JSON.stringify(data));
    return true;
  }

  public sendFileMessage(data: FileTransferMessage): boolean {
    if (!this.fileChannel || this.fileChannel.readyState !== "open") {
      return false;
    }
    this.fileChannel.send(JSON.stringify(data));
    return true;
  }

  public sendClipboardMessage(data: ClipboardUpdateMessage | ClipboardAckMessage): boolean {
    if (!this.clipboardChannel || this.clipboardChannel.readyState !== "open") {
      return false;
    }
    this.clipboardChannel.send(JSON.stringify(data));
    return true;
  }

  public sendChatMessage(data: ChatProtocolMessage): boolean {
    if (!this.chatChannel || this.chatChannel.readyState !== "open") {
      return false;
    }
    this.chatChannel.send(JSON.stringify(data));
    return true;
  }

  public getFileBufferedAmount(): number {
    return this.fileChannel ? this.fileChannel.bufferedAmount : 0;
  }

  public sendTelemetry(snapshot: RTCTelemetrySnapshot): boolean {
    if (!this.telemetryChannel || this.telemetryChannel.readyState !== "open") {
      return false;
    }
    this.telemetryChannel.send(JSON.stringify(snapshot));
    return true;
  }

  public getConnectionState(): RTCConnectionState {
    return this.connectionState;
  }

  public getIceState(): ICEConnectionState {
    return this.iceState;
  }

  public getDataChannelState(): DataChannelState {
    return this.dataChannelState;
  }

  public getRttMs(): number {
    return this.currentRttMs;
  }

  public getSnapshot(): RTCTelemetrySnapshot {
    return {
      sessionId: this.sessionId || "",
      timestamp: Date.now(),
      connectionState: this.connectionState,
      iceState: this.iceState,
      dataChannelState: this.dataChannelState,
      rttMs: this.currentRttMs,
      quality: this.calculateQuality(this.currentRttMs, 0),
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
      packetsLost: 0,
    };
  }

  public close(): void {
    this.stopPingTimer();
    this.stopStatsTimer();

    if (this.controlChannel) {
      this.controlChannel.close();
      this.controlChannel = null;
    }
    if (this.fileChannel) {
      this.fileChannel.close();
      this.fileChannel = null;
    }
    if (this.clipboardChannel) {
      this.clipboardChannel.close();
      this.clipboardChannel = null;
    }
    if (this.chatChannel) {
      this.chatChannel.close();
      this.chatChannel = null;
    }
    if (this.telemetryChannel) {
      this.telemetryChannel.close();
      this.telemetryChannel = null;
    }
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }

    this.videoSender = null;
    this.remoteStream = null;
    this.setConnectionState("CLOSED");
    this.setDataChannelState("CLOSED");
  }

  public on(event: string, handler: RTCEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private setupControlChannel(channel: RTCDataChannel): void {
    this.controlChannel = channel;

    this.controlChannel.onopen = () => {
      this.setDataChannelState("OPEN");
      this.startPingTimer();
      this.startStatsTimer();
      this.emit("datachannel_open", { channel: "control" });
    };

    this.controlChannel.onclose = () => {
      this.setDataChannelState("CLOSED");
      this.stopPingTimer();
      this.stopStatsTimer();
      this.emit("datachannel_close", { channel: "control" });
    };

    this.controlChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        this.handleControlMessage(msg);
      } catch {
        // Ignore unparseable
      }
    };
  }

  private setupFileChannel(channel: RTCDataChannel): void {
    this.fileChannel = channel;

    this.fileChannel.onopen = () => {
      this.emit("datachannel_open", { channel: "file" });
    };

    this.fileChannel.onclose = () => {
      this.emit("datachannel_close", { channel: "file" });
    };

    this.fileChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as FileTransferMessage;
        this.emit("file_message", msg);
      } catch {
        // Ignore unparseable
      }
    };
  }

  private setupClipboardChannel(channel: RTCDataChannel): void {
    this.clipboardChannel = channel;

    this.clipboardChannel.onopen = () => {
      this.emit("datachannel_open", { channel: "clipboard" });
    };

    this.clipboardChannel.onclose = () => {
      this.emit("datachannel_close", { channel: "clipboard" });
    };

    this.clipboardChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as
          ClipboardUpdateMessage | ClipboardAckMessage;
        this.emit("clipboard_message", msg);
      } catch {
        // Ignore unparseable
      }
    };
  }

  private setupChatChannel(channel: RTCDataChannel): void {
    this.chatChannel = channel;

    this.chatChannel.onopen = () => {
      this.emit("datachannel_open", { channel: "chat" });
    };

    this.chatChannel.onclose = () => {
      this.emit("datachannel_close", { channel: "chat" });
    };

    this.chatChannel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ChatProtocolMessage;
        this.emit("chat_message", msg);
      } catch {
        // Ignore unparseable
      }
    };
  }

  private setupTelemetryChannel(channel: RTCDataChannel): void {
    this.telemetryChannel = channel;
    this.telemetryChannel.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data as string) as RTCTelemetrySnapshot;
        this.emit("telemetry_received", snapshot);
      } catch {
        // Ignore
      }
    };
  }

  private handleControlMessage(msg: Record<string, unknown>): void {
    if (msg.type === "control.ping") {
      const pong = {
        type: "control.pong",
        sequence: msg.sequence,
        originalTimestamp: msg.timestamp,
        receivedTimestamp: Date.now(),
      };
      this.sendControl(pong);
    } else if (msg.type === "control.pong") {
      const originalTs = (msg.originalTimestamp as number) || 0;
      this.currentRttMs = Math.max(1, Date.now() - originalTs);
      this.emit("rtt_update", { rttMs: this.currentRttMs });
    } else {
      this.emit("control_message", msg);
    }
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.peer || !this.remoteDescriptionSet) return;

    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      if (candidate) {
        try {
          await this.peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // Ignore
        }
      }
    }
  }

  private startPingTimer(): void {
    this.stopPingTimer();
    this.pingTimer = setInterval(() => {
      this.pingSequence++;
      this.sendControl({
        type: "control.ping",
        sequence: this.pingSequence,
        timestamp: Date.now(),
      });
    }, 2000);
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private startStatsTimer(): void {
    this.stopStatsTimer();
    this.statsTimer = setInterval(async () => {
      if (!this.peer) return;

      try {
        const stats = await this.peer.getStats();
        let bytesSent = 0;
        let bytesReceived = 0;
        let packetsSent = 0;
        let packetsReceived = 0;
        let packetsLost = 0;
        let transportType: "DIRECT" | "RELAY" = "DIRECT";

        stats.forEach((report) => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            const remoteReport = stats.get(report.remoteCandidateId);
            if (remoteReport && remoteReport.candidateType === "relay") {
              transportType = "RELAY";
            }
          }
          if (report.type === "outbound-rtp") {
            bytesSent += report.bytesSent || 0;
            packetsSent += report.packetsSent || 0;
          }
          if (report.type === "inbound-rtp") {
            bytesReceived += report.bytesReceived || 0;
            packetsReceived += report.packetsReceived || 0;
            packetsLost += report.packetsLost || 0;
          }
        });

        const quality = this.calculateQuality(this.currentRttMs, packetsLost);
        this.emit("stats_update", {
          rttMs: this.currentRttMs,
          quality,
          transportType,
          bytesSent,
          bytesReceived,
          packetsSent,
          packetsReceived,
          packetsLost,
        });
      } catch {
        // Ignore stats polling error
      }
    }, 2000);
  }

  private stopStatsTimer(): void {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  private calculateQuality(rtt: number, lost: number): ConnectionQuality {
    if (this.connectionState !== "CONNECTED") return "FAILED";
    if (rtt <= 50 && lost <= 5) return "EXCELLENT";
    if (rtt <= 120 && lost <= 20) return "GOOD";
    if (rtt <= 250 && lost <= 50) return "FAIR";
    return "POOR";
  }

  private handleIceFailure(): void {
    this.emit("ice_failure", { sessionId: this.sessionId });
  }

  private setConnectionState(state: RTCConnectionState): void {
    this.connectionState = state;
    this.emit("connection_state_change", { state });
  }

  private setIceState(state: ICEConnectionState): void {
    this.iceState = state;
    this.emit("ice_state_change", { state });
  }

  private setDataChannelState(state: DataChannelState): void {
    this.dataChannelState = state;
    this.emit("datachannel_state_change", { state });
  }

  private emit(type: string, data: unknown): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        handler({ type, data });
      }
    }
  }
}
