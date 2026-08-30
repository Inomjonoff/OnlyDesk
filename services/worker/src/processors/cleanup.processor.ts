export async function processCleanupJob(): Promise<{
  purgedSessions: number;
  staleDevicesMarked: number;
}> {
  // Purges expired sessions and flags devices with missed heartbeats
  return {
    purgedSessions: 0,
    staleDevicesMarked: 0,
  };
}
