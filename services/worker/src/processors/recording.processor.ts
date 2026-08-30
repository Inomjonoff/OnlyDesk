export interface RecordingJobData {
  sessionId: string;
  recordingId: string;
  sourceChunksPath: string;
  targetFormat: "webm" | "mp4";
}

export async function processRecordingJob(
  data: RecordingJobData,
): Promise<{ success: boolean; storageUrl: string }> {
  // Simulates transcode & MinIO upload pipeline in Phase 0
  return {
    success: true,
    storageUrl: `http://localhost:9000/nexusdesk-recordings/${data.sessionId}/${data.recordingId}.${data.targetFormat}`,
  };
}
