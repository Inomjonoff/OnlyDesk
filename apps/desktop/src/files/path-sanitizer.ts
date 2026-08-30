export class PathSanitizer {
  private static readonly RESERVED_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;
  private static readonly TRAVERSAL_PATTERNS = /(^\.\.[\/\\]|\/\.\.[\/\\]|[\/\\]\.\.$|^\.\.$)/;
  private static readonly DRIVE_LETTER = /^[a-zA-Z]:/;
  private static readonly UNC_PATH = /^[\/\\]{2}/;

  public static isPathTraversalAttempt(fileName: string): boolean {
    if (!fileName || typeof fileName !== "string") return true;
    if (this.TRAVERSAL_PATTERNS.test(fileName)) return true;
    if (fileName.includes("..")) return true;
    if (this.DRIVE_LETTER.test(fileName)) return true;
    if (this.UNC_PATH.test(fileName)) return true;
    if (fileName.startsWith("/") || fileName.startsWith("\\")) return true;
    if (fileName.includes("\0")) return true;
    return false;
  }

  public static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== "string") {
      return "downloaded_file";
    }

    // Strip leading drive letter or UNC prefix
    let clean = fileName.replace(this.DRIVE_LETTER, "").replace(this.UNC_PATH, "");

    // Normalize slashes and take only the basename
    const parts = clean.split(/[/\\]/);
    clean = parts[parts.length - 1] || "downloaded_file";

    // Remove reserved and control characters
    clean = clean.replace(this.RESERVED_CHARS, "_");

    // Remove any remaining leading/trailing dots or spaces
    clean = clean.replace(/^[.\s]+|[.\s]+$/g, "");

    if (clean.length === 0 || clean === ".." || clean === ".") {
      clean = "downloaded_file";
    }

    // Enforce 255 character maximum
    if (clean.length > 255) {
      const extIndex = clean.lastIndexOf(".");
      if (extIndex > 0 && clean.length - extIndex < 15) {
        const ext = clean.substring(extIndex);
        clean = clean.substring(0, 255 - ext.length) + ext;
      } else {
        clean = clean.substring(0, 255);
      }
    }

    return clean;
  }

  public static resolveUniqueFileName(
    sanitizedName: string,
    existingFiles: Set<string> | string[],
  ): string {
    const existing = new Set(existingFiles);
    if (!existing.has(sanitizedName)) {
      return sanitizedName;
    }

    const dotIndex = sanitizedName.lastIndexOf(".");
    let baseName = sanitizedName;
    let extension = "";

    if (dotIndex > 0) {
      baseName = sanitizedName.substring(0, dotIndex);
      extension = sanitizedName.substring(dotIndex);
    }

    let counter = 1;
    let candidate = `${baseName} (${counter})${extension}`;
    while (existing.has(candidate)) {
      counter++;
      candidate = `${baseName} (${counter})${extension}`;
    }

    return candidate;
  }

  public static getTempPartFileName(transferId: string): string {
    const cleanId = transferId.replace(/[^a-zA-Z0-9_-]/g, "");
    return `.nexusdesk-transfer-${cleanId}.part`;
  }
}
