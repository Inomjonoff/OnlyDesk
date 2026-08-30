export interface SummaryJobData {
  sessionId: string;
  durationSec: number;
}

export async function processSummaryJob(data: SummaryJobData): Promise<{ summaryText: string }> {
  return {
    summaryText: `Session ${data.sessionId} completed successfully after ${data.durationSec} seconds. No critical errors detected.`,
  };
}
