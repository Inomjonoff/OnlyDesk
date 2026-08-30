export class SignalingMetricsCollector {
  private static activeConnections = 0;
  private static messagesRelayed = 0;
  private static sessionNegotiations = 0;
  private static rtcOffers = 0;
  private static rtcAnswers = 0;
  private static iceCandidatesExchanged = 0;

  public static onConnectionOpened(): void {
    this.activeConnections++;
  }

  public static onConnectionClosed(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  public static onMessageRelayed(type: string): void {
    this.messagesRelayed++;
    if (type === "session.request") this.sessionNegotiations++;
    else if (type === "rtc.offer") this.rtcOffers++;
    else if (type === "rtc.answer") this.rtcAnswers++;
    else if (type === "rtc.ice_candidate") this.iceCandidatesExchanged++;
  }

  public static getMetrics(): {
    activeConnections: number;
    messagesRelayed: number;
    sessionNegotiations: number;
    rtcOffers: number;
    rtcAnswers: number;
    iceCandidatesExchanged: number;
  } {
    return {
      activeConnections: this.activeConnections,
      messagesRelayed: this.messagesRelayed,
      sessionNegotiations: this.sessionNegotiations,
      rtcOffers: this.rtcOffers,
      rtcAnswers: this.rtcAnswers,
      iceCandidatesExchanged: this.iceCandidatesExchanged,
    };
  }

  public static toPrometheusFormat(): string {
    const m = this.getMetrics();
    return [
      `# HELP nexusdesk_signaling_connections Active WebSocket connections`,
      `# TYPE nexusdesk_signaling_connections gauge`,
      `nexusdesk_signaling_connections ${m.activeConnections}`,
      ``,
      `# HELP nexusdesk_signaling_messages_relayed_total Total signaling messages relayed`,
      `# TYPE nexusdesk_signaling_messages_relayed_total counter`,
      `nexusdesk_signaling_messages_relayed_total ${m.messagesRelayed}`,
      ``,
      `# HELP nexusdesk_signaling_session_negotiations_total Session negotiation requests`,
      `# TYPE nexusdesk_signaling_session_negotiations_total counter`,
      `nexusdesk_signaling_session_negotiations_total ${m.sessionNegotiations}`,
      ``,
      `# HELP nexusdesk_signaling_rtc_offers_total WebRTC SDP offers exchanged`,
      `# TYPE nexusdesk_signaling_rtc_offers_total counter`,
      `nexusdesk_signaling_rtc_offers_total ${m.rtcOffers}`,
      ``,
      `# HELP nexusdesk_signaling_ice_candidates_total ICE candidates exchanged`,
      `# TYPE nexusdesk_signaling_ice_candidates_total counter`,
      `nexusdesk_signaling_ice_candidates_total ${m.iceCandidatesExchanged}`,
    ].join("\n");
  }
}
