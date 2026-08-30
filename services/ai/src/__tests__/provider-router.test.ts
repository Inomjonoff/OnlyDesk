import { describe, it, expect, vi } from "vitest";
import { AIProviderRouter } from "../providers/router";
import { MockAIProvider } from "../providers/mock.provider";
import { AIRequest } from "@nexusdesk/types";

describe("AIProviderRouter", () => {
  it("should select the preferred provider if registered", () => {
    const router = new AIProviderRouter();
    const googleMock = new MockAIProvider({ name: "google" });
    const anthropicMock = new MockAIProvider({ name: "anthropic" });

    router.registerProvider(googleMock);
    router.registerProvider(anthropicMock);

    const selected = router.selectProvider("anthropic");
    expect(selected.name).toBe("anthropic");
  });

  it("should match required capabilities (e.g. vision)", () => {
    const router = new AIProviderRouter();
    const noVision = new MockAIProvider({ name: "ollama", capabilities: { vision: false } });
    const withVision = new MockAIProvider({ name: "google", capabilities: { vision: true } });

    router.registerProvider(noVision);
    router.registerProvider(withVision);

    const selected = router.selectProvider("ollama", { vision: true });
    expect(selected.name).toBe("google");
  });

  it("should fallback to secondary provider when primary fails", async () => {
    const router = new AIProviderRouter({ fallbackEnabled: true, maxRetries: 0 });
    const failingGoogle = new MockAIProvider({ name: "google", available: false });
    const workingAnthropic = new MockAIProvider({ name: "anthropic", available: true });

    router.registerProvider(failingGoogle);
    router.registerProvider(workingAnthropic);

    const request: AIRequest = {
      requestId: "req_test_1",
      sessionId: "s1",
      systemPrompt: "System",
      messages: [
        {
          messageId: "m1",
          conversationId: "c1",
          role: "user",
          content: "Hello",
          timestamp: Date.now(),
        },
      ],
    };

    const res = await router.execute(request, "google");
    expect(res.provider).toBe("anthropic");
    expect(res.content).toBeDefined();
  });

  it("should record usage metrics and estimate costs", async () => {
    const usageCalls: any[] = [];
    const router = new AIProviderRouter({
      onUsageRecorded: (u) => usageCalls.push(u),
    });

    const mock = new MockAIProvider({ name: "google" });
    router.registerProvider(mock);

    const request: AIRequest = {
      requestId: "req_usage_1",
      sessionId: "s1",
      systemPrompt: "System",
      messages: [
        {
          messageId: "m1",
          conversationId: "c1",
          role: "user",
          content: "Test prompt",
          timestamp: Date.now(),
        },
      ],
    };

    await router.execute(request);
    expect(usageCalls.length).toBe(1);
    expect(usageCalls[0].requestId).toBe("req_usage_1");
    expect(usageCalls[0].inputTokens).toBeGreaterThan(0);
    expect(usageCalls[0].estimatedCost).toBeGreaterThanOrEqual(0);
  });
});
