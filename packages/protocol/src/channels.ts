import { ChannelType } from "@nexusdesk/types";

export const RTC_CHANNELS: Record<string, ChannelType> = {
  CONTROL: "control",
  INPUT: "input",
  CLIPBOARD: "clipboard",
  FILE: "file",
  TELEMETRY: "telemetry",
  CHAT: "chat",
} as const;

export const RTC_CHANNEL_CONFIGS: Record<ChannelType, RTCDataChannelInit> = {
  control: {
    ordered: true,
    maxRetransmits: 5,
  },
  input: {
    ordered: false, // Low latency input (UDP style)
    maxRetransmits: 0,
  },
  clipboard: {
    ordered: true,
  },
  file: {
    ordered: true,
  },
  telemetry: {
    ordered: false,
    maxRetransmits: 1,
  },
  chat: {
    ordered: true,
  },
};
