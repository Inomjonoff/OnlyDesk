import * as crypto from "node:crypto";

export function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function sha256Buffer(data: Buffer): Buffer {
  return crypto.createHash("sha256").update(data).digest();
}

export function hmacSha256(key: string | Buffer, data: string | Buffer): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

export function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
