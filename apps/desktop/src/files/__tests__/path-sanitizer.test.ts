import { describe, it, expect } from "vitest";
import { PathSanitizer } from "../path-sanitizer";

describe("Phase 6: PathSanitizer Security & Collision Defense Tests", () => {
  it("detects path traversal attempts correctly", () => {
    expect(PathSanitizer.isPathTraversalAttempt("../secret.txt")).toBe(true);
    expect(PathSanitizer.isPathTraversalAttempt("..\\secret.txt")).toBe(true);
    expect(PathSanitizer.isPathTraversalAttempt("folder/../../secret.txt")).toBe(true);
    expect(PathSanitizer.isPathTraversalAttempt("C:\\Windows\\system32\\cmd.exe")).toBe(true);
    expect(PathSanitizer.isPathTraversalAttempt("/etc/passwd")).toBe(true);
    expect(PathSanitizer.isPathTraversalAttempt("\\\\server\\share\\file.txt")).toBe(true);
    expect(PathSanitizer.isPathTraversalAttempt("safe_file\0.txt")).toBe(true);

    expect(PathSanitizer.isPathTraversalAttempt("project_archive.zip")).toBe(false);
    expect(PathSanitizer.isPathTraversalAttempt("document.pdf")).toBe(false);
  });

  it("sanitizes dangerous filenames into safe basenames", () => {
    expect(PathSanitizer.sanitizeFileName("../../../malicious.exe")).toBe("malicious.exe");
    expect(PathSanitizer.sanitizeFileName("C:\\Users\\admin\\report.pdf")).toBe("report.pdf");
    expect(PathSanitizer.sanitizeFileName("folder/nested/data.csv")).toBe("data.csv");
    expect(PathSanitizer.sanitizeFileName("bad:name*?.txt")).toBe("bad_name__.txt");
    expect(PathSanitizer.sanitizeFileName("")).toBe("downloaded_file");
    expect(PathSanitizer.sanitizeFileName("..")).toBe("downloaded_file");
  });

  it("resolves duplicate filename collisions deterministically without overwriting", () => {
    const existing = new Set(["report.pdf", "report (1).pdf"]);
    const unique = PathSanitizer.resolveUniqueFileName("report.pdf", existing);
    expect(unique).toBe("report (2).pdf");

    const uniqueNew = PathSanitizer.resolveUniqueFileName("photo.jpg", existing);
    expect(uniqueNew).toBe("photo.jpg");
  });

  it("generates isolated temporary part file names", () => {
    const partName = PathSanitizer.getTempPartFileName("tr_12345-abc");
    expect(partName).toBe(".nexusdesk-transfer-tr_12345-abc.part");
  });
});
