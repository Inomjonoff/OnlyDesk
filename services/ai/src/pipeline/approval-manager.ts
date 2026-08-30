import { AiApprovalToken } from "@nexusdesk/types";
import { ActionLifecycleManager } from "./action-lifecycle";

export class ApprovalManager {
  private lifecycle: ActionLifecycleManager;
  private approvalTokens = new Map<string, AiApprovalToken>();

  constructor(lifecycle: ActionLifecycleManager) {
    this.lifecycle = lifecycle;
  }

  public approveProposal(params: {
    proposalId: string;
    sessionId: string;
    userId: string;
    deviceId: string;
  }): AiApprovalToken {
    const proposal = this.lifecycle.getProposal(params.proposalId);
    if (!proposal) {
      throw new Error("Action proposal not found");
    }

    if (proposal.status !== "APPROVAL_PENDING") {
      throw new Error(`Cannot approve proposal in status "${proposal.status}"`);
    }

    if (proposal.sessionId !== params.sessionId) {
      throw new Error("Cross-session approval rejected: Session ID mismatch");
    }

    if (proposal.deviceId !== params.deviceId) {
      throw new Error("Cross-device approval rejected: Device ID mismatch");
    }

    if (Date.now() > proposal.expiresAt) {
      this.lifecycle.transitionStatus(params.proposalId, "EXPIRED");
      throw new Error("Action proposal has expired");
    }

    this.lifecycle.transitionStatus(params.proposalId, "APPROVED");

    const approvalId = `appr_${proposal.proposalId}_${Date.now()}`;
    const token: AiApprovalToken = {
      approvalId,
      proposalId: proposal.proposalId,
      sessionId: params.sessionId,
      deviceId: params.deviceId,
      userId: params.userId,
      toolName: proposal.tool,
      argumentsHash: proposal.argumentsHash,
      nonce: `nonce_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      approvedAt: Date.now(),
      expiresAt: Date.now() + 60000, // 60s to consume
      used: false,
    };

    this.approvalTokens.set(approvalId, token);
    return token;
  }

  public rejectProposal(proposalId: string, reason?: string): void {
    const proposal = this.lifecycle.getProposal(proposalId);
    if (!proposal) {
      throw new Error("Action proposal not found");
    }

    if (proposal.status !== "APPROVAL_PENDING") {
      throw new Error(`Cannot reject proposal in status "${proposal.status}"`);
    }

    this.lifecycle.transitionStatus(proposalId, "REJECTED");
  }

  public validateAndConsumeToken(approvalId: string): AiApprovalToken {
    const token = this.approvalTokens.get(approvalId);
    if (!token) {
      throw new Error("Invalid or unknown approval token");
    }

    if (token.used) {
      throw new Error("Approval token has already been consumed");
    }

    if (Date.now() > token.expiresAt) {
      throw new Error("Approval token has expired");
    }

    if (!this.lifecycle.verifyAndConsumeNonce(token.nonce)) {
      throw new Error("Approval token nonce replay detected");
    }

    token.used = true;
    return token;
  }
}
