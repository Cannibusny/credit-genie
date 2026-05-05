import { randomUUID } from "node:crypto";
import { addDays, isPast, differenceInDays } from "date-fns";
import type { Dispute, Discrepancy, Bureau, DisputeStatus } from "../../types/index.js";
import { config } from "../../lib/config.js";
import { log } from "../../lib/logger.js";

// ─── Dispute Lifecycle ───────────────────────────────────────────────────────

export function createDispute(
  clientId: string,
  auditId: string,
  discrepancy: Discrepancy,
  bureau: Bureau,
  letterContent: string,
): Dispute {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    clientId,
    auditId,
    discrepancyId: discrepancy.id,
    bureau,
    status: "draft",
    letterContent,
    sentAt: null,
    responseDeadline: null,
    responseReceivedAt: null,
    responseContent: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function markDisputeSent(dispute: Dispute): Dispute {
  const now = new Date();
  const deadline = addDays(now, config.DISPUTE_RESPONSE_DEADLINE_DAYS);
  return {
    ...dispute,
    status: "pending_response",
    sentAt: now.toISOString(),
    responseDeadline: deadline.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function markDisputeResponse(
  dispute: Dispute,
  status: "verified" | "deleted" | "updated",
  responseContent: string,
): Dispute {
  return {
    ...dispute,
    status,
    responseReceivedAt: new Date().toISOString(),
    responseContent,
    updatedAt: new Date().toISOString(),
  };
}

export function escalateToLitigation(dispute: Dispute): Dispute {
  return {
    ...dispute,
    status: "escalated_litigation",
    updatedAt: new Date().toISOString(),
  };
}

// ─── Deadline Monitoring ─────────────────────────────────────────────────────

export interface DeadlineAlert {
  disputeId: string;
  bureau: Bureau;
  daysRemaining: number;
  isExpired: boolean;
  action: "reminder" | "expired_escalate";
}

export function checkDeadlines(disputes: Dispute[]): DeadlineAlert[] {
  const alerts: DeadlineAlert[] = [];
  const pendingDisputes = disputes.filter((d) => d.status === "pending_response");

  for (const dispute of pendingDisputes) {
    if (!dispute.responseDeadline) continue;
    const deadline = new Date(dispute.responseDeadline);
    const daysRemaining = differenceInDays(deadline, new Date());
    const isExpired = isPast(deadline);

    if (isExpired) {
      alerts.push({
        disputeId: dispute.id,
        bureau: dispute.bureau,
        daysRemaining: 0,
        isExpired: true,
        action: "expired_escalate",
      });
      log.warn({ disputeId: dispute.id, bureau: dispute.bureau }, "Dispute deadline expired — escalating");
    } else if (daysRemaining <= 5) {
      alerts.push({
        disputeId: dispute.id,
        bureau: dispute.bureau,
        daysRemaining,
        isExpired: false,
        action: "reminder",
      });
    }
  }

  return alerts;
}

// ─── Status Summary ──────────────────────────────────────────────────────────

export interface DisputeSummary {
  total: number;
  byStatus: Record<DisputeStatus, number>;
  expiredCount: number;
  readyForLitigation: Dispute[];
}

export function summarizeDisputes(disputes: Dispute[]): DisputeSummary {
  const byStatus: Record<DisputeStatus, number> = {
    draft: 0,
    sent: 0,
    pending_response: 0,
    verified: 0,
    deleted: 0,
    updated: 0,
    escalated_litigation: 0,
    expired: 0,
  };

  for (const d of disputes) {
    byStatus[d.status]++;
  }

  const readyForLitigation = disputes.filter(
    (d) =>
      d.status === "verified" ||
      (d.status === "pending_response" && d.responseDeadline && isPast(new Date(d.responseDeadline))),
  );

  return {
    total: disputes.length,
    byStatus,
    expiredCount: readyForLitigation.length,
    readyForLitigation,
  };
}
