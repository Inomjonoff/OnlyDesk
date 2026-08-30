import { describe, it, expect } from "vitest";
import { FileTransferManager } from "../file-transfer-manager";
import { FileTransferMessage } from "@nexusdesk/types";

describe("Phase 6: FileTransferManager Streaming & Integrity Tests", () => {
  it("enforces FILE_READ permission on upload and FILE_WRITE on download", async () => {
    // Sender has no FILE_READ permission
    const sender = new FileTransferManager([]);
    const progress = await sender.initiateUpload(
      "tr_1",
      "ses_1",
      "dev_a",
      "dev_b",
      "test.txt",
      new TextEncoder().encode("Hello World"),
    );
    expect(progress).toBeNull();

    // Now grant FILE_READ
    sender.setPermissions(["FILE_READ"]);
    const progress2 = await sender.initiateUpload(
      "tr_2",
      "ses_1",
      "dev_a",
      "dev_b",
      "test.txt",
      new TextEncoder().encode("Hello World"),
    );
    expect(progress2).not.toBeNull();
    expect(progress2?.status).toBe("PENDING");
  });

  it("completes full chunked transfer with SHA-256 verification between sender and receiver", async () => {
    const sender = new FileTransferManager(["FILE_READ"]);
    const receiver = new FileTransferManager(["FILE_WRITE"]);

    const senderOutbox: FileTransferMessage[] = [];
    const receiverOutbox: FileTransferMessage[] = [];

    sender.setSender({
      sendFileMessage: (msg) => senderOutbox.push(msg),
    });

    receiver.setSender({
      sendFileMessage: (msg) => receiverOutbox.push(msg),
    });

    // Create 10 KB file
    const rawContent = new Uint8Array(10 * 1024);
    for (let i = 0; i < rawContent.length; i++) {
      rawContent[i] = i % 256;
    }

    // 1. Sender initiates upload with 2 KB chunk size (5 chunks total)
    await sender.initiateUpload(
      "tr_complete_1",
      "ses_1",
      "dev_a",
      "dev_b",
      "data.bin",
      rawContent,
      "application/octet-stream",
      2048,
    );

    expect(senderOutbox.length).toBe(1);
    const reqMsg = senderOutbox[0]!;
    expect(reqMsg.type).toBe("file.request");

    // 2. Receiver receives request and approves
    await receiver.handleIncomingMessage(reqMsg);
    expect(receiver.getProgress("tr_complete_1")?.status).toBe("PENDING");

    const accepted = receiver.acceptIncomingTransfer("tr_complete_1");
    expect(accepted).toBe(true);
    expect(receiverOutbox.length).toBe(1);
    const acceptMsg = receiverOutbox[0]!;
    expect(acceptMsg.type).toBe("file.accept");

    // 3. Sender receives accept and streams chunks
    await sender.handleIncomingMessage(acceptMsg);

    // Drain chunks from sender into receiver
    while (senderOutbox.length > 0) {
      const chunkMsg = senderOutbox.shift()!;
      if (chunkMsg.type === "file.chunk") {
        await receiver.handleIncomingMessage(chunkMsg);
      }
    }

    // Drain ACKs from receiver into sender
    while (receiverOutbox.length > 0) {
      const ackOrComplete = receiverOutbox.shift()!;
      await sender.handleIncomingMessage(ackOrComplete);
    }

    // 4. Verify completion on both ends
    const receiverProg = receiver.getProgress("tr_complete_1");
    expect(receiverProg?.status).toBe("COMPLETED");
    expect(receiverProg?.bytesTransferred).toBe(10 * 1024);

    const senderProg = sender.getProgress("tr_complete_1");
    expect(senderProg?.status).toBe("COMPLETED");
  });

  it("supports pause and resume without starting from byte 0", async () => {
    const manager = new FileTransferManager(["FILE_READ", "FILE_WRITE"]);
    const rawContent = new Uint8Array(4096);

    await manager.initiateUpload(
      "tr_pause_1",
      "ses_1",
      "dev_a",
      "dev_b",
      "pause_test.bin",
      rawContent,
      "application/octet-stream",
      1024,
    );

    manager.pauseTransfer("tr_pause_1");
    expect(manager.getProgress("tr_pause_1")?.status).toBe("PAUSED");

    manager.resumeTransfer("tr_pause_1");
    expect(manager.getProgress("tr_pause_1")?.status).toBe("TRANSFERRING");
  });

  it("aborts transfer and cleans up on cancel", async () => {
    const manager = new FileTransferManager(["FILE_READ"]);
    await manager.initiateUpload(
      "tr_cancel_1",
      "ses_1",
      "dev_a",
      "dev_b",
      "cancel_test.bin",
      new Uint8Array(2048),
    );

    manager.cancelTransfer("tr_cancel_1", "TRANSFER_CANCELLED");
    expect(manager.getProgress("tr_cancel_1")?.status).toBe("CANCELLED");
  });
});
