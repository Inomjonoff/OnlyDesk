import { describe, it, expect } from "vitest";
import { ClipboardManager } from "../clipboard-manager";
import { ClipboardUpdateMessage } from "@nexusdesk/types";

describe("Phase 6: ClipboardManager Loop Prevention & Sync Tests", () => {
  it("enforces CLIPBOARD_READ and CLIPBOARD_WRITE permissions independently", async () => {
    const mgr = new ClipboardManager("dev_local", []);

    // Sending without CLIPBOARD_READ should fail
    const sent = await mgr.syncLocalClipboard("TEXT", "Hello Clipboard");
    expect(sent).toBe(false);

    mgr.setPermissions(["CLIPBOARD_READ"]);
    const sent2 = await mgr.syncLocalClipboard("TEXT", "Hello Clipboard");
    expect(sent2).toBe(true);

    // Receiving without CLIPBOARD_WRITE should fail
    const incoming: ClipboardUpdateMessage = {
      type: "clipboard.update",
      clipboardId: "clp_1",
      originDeviceId: "dev_remote",
      sequence: 1,
      clipboardType: "TEXT",
      content: "Remote Text",
      sha256: "fakehash",
      sizeBytes: 11,
      timestamp: Date.now(),
    };

    const accepted = await mgr.handleIncomingMessage(incoming);
    expect(accepted).toBe(false);
  });

  it("prevents broadcast loops by rejecting self-originated messages and duplicate content hashes", async () => {
    const mgr = new ClipboardManager("dev_local", ["CLIPBOARD_READ", "CLIPBOARD_WRITE"]);
    const outbox: unknown[] = [];
    mgr.setSender({
      sendClipboardMessage: (msg) => outbox.push(msg),
    });

    // 1. Local copy
    await mgr.syncLocalClipboard("TEXT", "Loop Test Content");
    expect(outbox.length).toBe(1);

    // 2. Immediate identical local copy should be ignored (deduplicated)
    const duplicateSend = await mgr.syncLocalClipboard("TEXT", "Loop Test Content");
    expect(duplicateSend).toBe(false);
    expect(outbox.length).toBe(1);

    // 3. Incoming message originating from self should be ignored
    const selfMsg = outbox[0] as ClipboardUpdateMessage;
    const handledSelf = await mgr.handleIncomingMessage(selfMsg);
    expect(handledSelf).toBe(false);
  });

  it("rejects oversized clipboard text exceeding 1 MiB", async () => {
    const mgr = new ClipboardManager("dev_local", ["CLIPBOARD_READ"]);
    // 2 MiB string
    const largeText = "A".repeat(2 * 1024 * 1024);

    const sent = await mgr.syncLocalClipboard("TEXT", largeText);
    expect(sent).toBe(false);
  });
});
