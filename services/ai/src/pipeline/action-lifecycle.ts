import { AiActionProposal, AiActionStatus, AiRiskLevel } from "@nexusdesk/types";
import { createHash } from "crypto";

const VALID_TRANSITIONS: Record<AiActionStatus, AiActionStatus[]> = {
  PROPOSED: ["APPROVAL_PENDING", "APPROVED", "REJECTED", "EXPIRED", "CANCELLED"],
  APPROVAL_PENDING: ["APPROVED", "REJECTED", "EXPIRED", "CANCELLED"],
  APPROVED: ["EXECUTING", "CANCELLED"],
  REJECTED: [],
  EXPIRED: [],
  EXECUTING: ["VERIFYING", "FAILED", "CANCELLED"],
  VERIFYING: ["VERIFIED", "FAILED"],
  VERIFIED: [],
  FAILED: [],
  CANCELLED: [],
};

export class ActionLifecycleManager {
  private proposals = new Map<string, AiActionProposal>();
  private usedNonces = new Set<string>();

  public createProposal(params: {
    sessionId: string;
    deviceId: string;
    userId: string;
    aiRequestId: string;
    tool: string;
    arguments: Record<string, unknown>;
    reason: string;
    risk: AiRiskLevel;
    requiresApproval: boolean;
    expectedResult?: string;
    ttlSeconds?: number;
  }): AiActionProposal {
    const proposalId = `prop_${params.sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const argumentsHash = this.computeArgumentsHash(params.arguments);
    const ttl = (params.ttlSeconds ?? 60) * 1000;
    const now = Date.now();

    const proposal: AiActionProposal = {
      proposalId,
      sessionId: params.sessionId,
      deviceId: params.deviceId,
      userId: params.userId,
      aiRequestId: params.aiRequestId,
      tool: params.tool,
      arguments: params.arguments,
      argumentsHash,
      reason: params.reason,
      risk: params.risk,
      requiresApproval: params.requiresApproval,
      expectedResult: params.expectedResult,
      status: params.requiresApproval ? "APPROVAL_PENDING" : "APPROVED",
      createdAt: now,
      expiresAt: now + ttl,
    };

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  public getProposal(proposalId: string): AiActionProposal | undefined {
    const proposal = this.proposals.get(proposalId);
    if (proposal && proposal.status === "APPROVAL_PENDING" && Date.now() > proposal.expiresAt) {
      proposal.status = "EXPIRED";
    }
    return proposal;
  }

  public transitionStatus(proposalId: string, newStatus: AiActionStatus): AiActionProposal {
    const proposal = this.getProposal(proposalId);
    if (!proposal) {
      throw new Error(`Action proposal "${proposalId}" not found`);
    }

    const allowed = VALID_TRANSITIONS[proposal.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid state transition from ${proposal.status} to ${newStatus}`);
    }

    proposal.status = newStatus;
    return proposal;
  }

  public computeArgumentsHash(args: Record<string, unknown>): string {
    return createHash("sha256").update(JSON.stringify(args)).digest("hex");
  }

  public verifyAndConsumeNonce(nonce: string): boolean {
    if (this.usedNonces.has(nonce)) {
      return false;
    }
    this.usedNonces.add(nonce);
    return true;
  }
}
