const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Base32-like (unambiguous characters)

export function generateDeviceId(): string {
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let part1 = "";
  let part2 = "";

  for (let i = 0; i < 4; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      part1 += ALPHANUMERIC[byte % ALPHANUMERIC.length];
    }
  }

  for (let i = 4; i < 8; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      part2 += ALPHANUMERIC[byte % ALPHANUMERIC.length];
    }
  }

  return `NXD-${part1}-${part2}`;
}

export function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSessionId(): string {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID) {
    return `ses_${globalThis.crypto.randomUUID()}`;
  }
  return `ses_${generateSecureToken(16)}`;
}
