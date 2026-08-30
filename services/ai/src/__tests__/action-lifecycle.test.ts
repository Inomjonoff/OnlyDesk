import { describe, it, expect } from "vitest";
import { ActionLifecycleManager } from "../pipeline/action-lifecycle";
import { ApprovalManager } from "../pipeline/approval-manager";

describe("Action Lifecycle & Approval Manager", () => {
  it("should create a proposal with valid arguments hash and status", () => {
    const lifecycle = new ActionLifecycleManager();
    const proposal = lifecycle.createProposal({
      sessionId: "s1",
      deviceId: "d1",
      userId: "u1",
      aiRequestId: "req_1",
      tool: "restart_supported_application",
      arguments: { applicationId: "app_chrome" },
      reason: "Optimize memory",
      risk: "MEDIUM",
      requiresApproval: true,
    });

    expect(proposal.status).toBe("APPROVAL_PENDING");
    expect(proposal.argumentsHash).toBeDefined();
    expect(proposal.argumentsHash.length).toBe(64); // SHA-256
  });

  it("should approve a pending proposal and generate an approval token", () => {
    const lifecycle = new ActionLifecycleManager();
    const approvalManager = new ApprovalManager(lifecycle);

    const proposal = lifecycle.createProposal({
      sessionId: "s1",
      deviceId: "d1",
      userId: "u1",
      aiRequestId: "req_1",
      tool: "restart_supported_application",
      arguments: { applicationId: "app_chrome" },
      reason: "Optimize memory",
      risk: "MEDIUM",
      requiresApproval: true,
    });

    const token = approvalManager.approveProposal({
      proposalId: proposal.proposalId,
      sessionId: "s1",
      deviceId: "d1",
      userId: "u1",
    });

    expect(token.approvalId).toBeDefined();
    expect(token.used).toBe(false);
    expect(proposal.status).toBe("APPROVED");

    // Consume token
    const consumed = approvalManager.validateAndConsumeToken(token.approvalId);
    expect(consumed.used).toBe(true);

    // Replay attempt fails
    expect(() => approvalManager.validateAndConsumeToken(token.approvalId)).toThrow(
      "Approval token has already been consumed",
    );
  });

  it("should reject cross-session approval attempts", () => {
    const lifecycle = new ActionLifecycleManager();
    const approvalManager = new ApprovalManager(lifecycle);

    const proposal = lifecycle.createProposal({
      sessionId: "s1",
      deviceId: "d1",
      userId: "u1",
      aiRequestId: "req_1",
      tool: "restart_supported_application",
      arguments: { applicationId: "app_chrome" },
      reason: "Optimize memory",
      risk: "MEDIUM",
      requiresApproval: true,
    });

    // Attempting to approve for session s2 instead of s1
    expect(() =>
      approvalManager.approveProposal({
        proposalId: proposal.proposalId,
        sessionId: "s2",
        deviceId: "d1",
        userId: "u1",
      }),
    ).toThrow("Cross-session approval rejected");
  });

  it("should reject invalid state machine transitions", () => {
    const lifecycle = new ActionLifecycleManager();
    const proposal = lifecycle.createProposal({
      sessionId: "s1",
      deviceId: "d1",
      userId: "u1",
      aiRequestId: "req_1",
      tool: "restart_supported_application",
      arguments: {},
      reason: "test",
      risk: "MEDIUM",
      requiresApproval: true,
    });

    // Cannot transition directly from APPROVAL_PENDING to VERIFIED
    expect(() => lifecycle.transitionStatus(proposal.proposalId, "VERIFIED")).toThrow(
      "Invalid state transition",
    );
  });
});
