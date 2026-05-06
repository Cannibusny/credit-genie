import type { AuditResult, Dispute, GeneratedDocument } from "../types/index.js";

// In-memory stores shared between route modules.
// In production, swap for Supabase.

export const audits = new Map<string, AuditResult>();
export const disputes = new Map<string, Dispute[]>();
export const generatedLetters = new Map<string, GeneratedDocument[]>();

/** Update a single dispute inside the Map keyed by auditId. */
export function updateDispute(disputeId: string, updater: (d: Dispute) => Dispute): Dispute | null {
  for (const [auditId, list] of disputes) {
    const idx = list.findIndex((d) => d.id === disputeId);
    if (idx >= 0) {
      const existing = list[idx];
      if (!existing) continue;
      list[idx] = updater(existing);
      disputes.set(auditId, list);
      return list[idx] ?? null;
    }
  }
  return null;
}
