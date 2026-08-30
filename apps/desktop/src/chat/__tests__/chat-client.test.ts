import { describe, it, expect } from "vitest";
import { ChatClient } from "../chat-client";
import { ChatProtocolMessage } from "@nexusdesk/types";

describe("Phase 7: ChatClient In-Session Text Messaging Tests", () => {
  it("sends message and updates delivery state to SENT when transport is open", () => {
    const client = new ChatClient("ses_test_1", "usr_1", "dev_1", "Naimjon");
    const outbox: ChatProtocolMessage[] = [];

    client.setSender({
      sendChatMessage: (msg) => {
        outbox.push(msg);
        return true;
      },
    });

    const msg = client.sendMessage("Hello remote peer!");
    expect(msg).not.toBeNull();
    expect(msg?.text).toBe("Hello remote peer!");
    expect(msg?.deliveryState).toBe("SENT");
    expect(outbox.length).toBe(1);
  });

  it("queues messages in outbox when transport is initially unavailable and flushes on connect", () => {
    const client = new ChatClient("ses_test_1", "usr_1", "dev_1", "Naimjon");
    const msg = client.sendMessage("Queued message");

    expect(msg).not.toBeNull();
    expect(msg?.deliveryState).toBe("SENDING");

    const outbox: ChatProtocolMessage[] = [];
    client.setSender({
      sendChatMessage: (m) => {
        outbox.push(m);
        return true;
      },
    });

    expect(outbox.length).toBe(1);
    expect(msg?.deliveryState).toBe("SENT");
  });

  it("handles incoming message with idempotency and sends ACK back", () => {
    const clientA = new ChatClient("ses_test_1", "usr_a", "dev_a", "Alice");
    const clientB = new ChatClient("ses_test_1", "usr_b", "dev_b", "Bob");

    const aOutbox: ChatProtocolMessage[] = [];
    const bOutbox: ChatProtocolMessage[] = [];

    clientA.setSender({ sendChatMessage: (m) => (aOutbox.push(m), true) });
    clientB.setSender({ sendChatMessage: (m) => (bOutbox.push(m), true) });

    // Alice sends to Bob
    clientA.sendMessage("Are you ready?");
    expect(aOutbox.length).toBe(1);

    // Bob receives
    const handled = clientB.handleIncomingMessage(aOutbox[0]!);
    expect(handled).toBe(true);
    expect(clientB.getMessageCount()).toBe(1);
    expect(bOutbox.length).toBe(1); // Bob generated an ACK

    // Alice receives Bob's ACK
    clientA.handleIncomingMessage(bOutbox[0]!);
    expect(clientA.getMessages()[0]?.deliveryState).toBe("DELIVERED");

    // Replaying duplicate message to Bob should be ignored
    const duplicateHandled = clientB.handleIncomingMessage(aOutbox[0]!);
    expect(duplicateHandled).toBe(false);
    expect(clientB.getMessageCount()).toBe(1);
  });

  it("rejects oversized chat messages exceeding 16 KiB", () => {
    const client = new ChatClient("ses_test_1", "usr_1", "dev_1", "Naimjon");
    const largeText = "A".repeat(17 * 1024);

    const msg = client.sendMessage(largeText);
    expect(msg).toBeNull();
  });

  it("creates system messages cleanly", () => {
    const client = new ChatClient("ses_test_1", "usr_1", "dev_1", "Naimjon");
    const sysMsg = client.addSystemMessage("Screen sharing started");

    expect(sysMsg.type).toBe("SYSTEM");
    expect(sysMsg.senderName).toBe("System");
    expect(sysMsg.deliveryState).toBe("DELIVERED");
    expect(client.getMessageCount()).toBe(1);
  });
});
