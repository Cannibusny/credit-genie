import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import type {
  AccountMatch,
  AuditResult,
  Bureau,
  Discrepancy,
  Dispute,
  DisputeStatus,
  GeneratedDocument,
  LitigationPackage,
  ParsedCreditReport,
} from "../types/index.js";

// ─── Audits ──────────────────────────────────────────────────────────────────

export function saveAudit(audit: AuditResult): void {
  db.insert(schema.audits)
    .values({
      id: audit.id,
      clientId: audit.clientId,
      createdAt: audit.createdAt,
      reports: JSON.stringify(audit.reports),
      matchedAccounts: JSON.stringify(audit.matchedAccounts),
      discrepancies: JSON.stringify(audit.discrepancies),
      totalViolations: audit.totalViolations,
      estimatedDamages: audit.estimatedDamages,
      summary: audit.summary,
    })
    .onConflictDoUpdate({
      target: schema.audits.id,
      set: {
        clientId: audit.clientId,
        createdAt: audit.createdAt,
        reports: JSON.stringify(audit.reports),
        matchedAccounts: JSON.stringify(audit.matchedAccounts),
        discrepancies: JSON.stringify(audit.discrepancies),
        totalViolations: audit.totalViolations,
        estimatedDamages: audit.estimatedDamages,
        summary: audit.summary,
      },
    })
    .run();
}

export function getAudit(id: string): AuditResult | null {
  const row = db.select().from(schema.audits).where(eq(schema.audits.id, id)).get();
  if (!row) return null;
  return {
    id: row.id,
    clientId: row.clientId,
    createdAt: row.createdAt,
    reports: JSON.parse(row.reports) as ParsedCreditReport[],
    matchedAccounts: JSON.parse(row.matchedAccounts) as AccountMatch[],
    discrepancies: JSON.parse(row.discrepancies) as Discrepancy[],
    totalViolations: row.totalViolations,
    estimatedDamages: row.estimatedDamages,
    summary: row.summary,
  };
}

// ─── Disputes ────────────────────────────────────────────────────────────────

function rowToDispute(row: typeof schema.disputes.$inferSelect): Dispute {
  return {
    id: row.id,
    clientId: row.clientId,
    auditId: row.auditId,
    discrepancyId: row.discrepancyId,
    bureau: row.bureau as Bureau,
    status: row.status as DisputeStatus,
    letterContent: row.letterContent,
    sentAt: row.sentAt,
    responseDeadline: row.responseDeadline,
    responseReceivedAt: row.responseReceivedAt,
    responseContent: row.responseContent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function disputeToInsert(d: Dispute): typeof schema.disputes.$inferInsert {
  return {
    id: d.id,
    clientId: d.clientId,
    auditId: d.auditId,
    discrepancyId: d.discrepancyId,
    bureau: d.bureau,
    status: d.status,
    letterContent: d.letterContent,
    sentAt: d.sentAt,
    responseDeadline: d.responseDeadline,
    responseReceivedAt: d.responseReceivedAt,
    responseContent: d.responseContent,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function saveDisputes(_auditId: string, disputeList: Dispute[]): void {
  if (disputeList.length === 0) return;
  for (const d of disputeList) {
    db.insert(schema.disputes)
      .values(disputeToInsert(d))
      .onConflictDoUpdate({
        target: schema.disputes.id,
        set: disputeToInsert(d),
      })
      .run();
  }
}

export function getDisputesByAudit(auditId: string): Dispute[] {
  const rows = db
    .select()
    .from(schema.disputes)
    .where(eq(schema.disputes.auditId, auditId))
    .all();
  return rows.map(rowToDispute);
}

export function getDispute(disputeId: string): Dispute | null {
  const row = db
    .select()
    .from(schema.disputes)
    .where(eq(schema.disputes.id, disputeId))
    .get();
  return row ? rowToDispute(row) : null;
}

export function updateDispute(
  disputeId: string,
  updater: (d: Dispute) => Dispute,
): Dispute | null {
  const existing = getDispute(disputeId);
  if (!existing) return null;
  const updated = updater(existing);
  db.update(schema.disputes)
    .set(disputeToInsert(updated))
    .where(eq(schema.disputes.id, disputeId))
    .run();
  return updated;
}

// ─── Generated Documents (dispute letters) ───────────────────────────────────

export function saveLetters(auditId: string, letters: GeneratedDocument[]): void {
  if (letters.length === 0) return;
  for (const letter of letters) {
    db.insert(schema.generatedDocuments)
      .values({
        auditId,
        type: letter.type,
        fileName: letter.fileName,
        content: letter.content,
        generatedAt: letter.generatedAt,
      })
      .run();
  }
}

export function getLetters(auditId: string): GeneratedDocument[] {
  const rows = db
    .select()
    .from(schema.generatedDocuments)
    .where(eq(schema.generatedDocuments.auditId, auditId))
    .all();
  return rows.map((r) => ({
    type: r.type as GeneratedDocument["type"],
    fileName: r.fileName,
    content: r.content,
    generatedAt: r.generatedAt,
  }));
}

// ─── Litigation Packages ────────────────────────────────────────────────────

export function saveLitigationPackage(pkg: LitigationPackage): void {
  db.insert(schema.litigationPackages)
    .values({
      id: pkg.id,
      clientId: pkg.clientId,
      disputeIds: JSON.stringify(pkg.disputes.map((d) => d.id)),
      jurisdiction: JSON.stringify(pkg.jurisdiction),
      courtForms: JSON.stringify(pkg.courtForms),
      estimatedDamages: pkg.estimatedDamages,
      createdAt: pkg.createdAt,
    })
    .onConflictDoUpdate({
      target: schema.litigationPackages.id,
      set: {
        clientId: pkg.clientId,
        disputeIds: JSON.stringify(pkg.disputes.map((d) => d.id)),
        jurisdiction: JSON.stringify(pkg.jurisdiction),
        courtForms: JSON.stringify(pkg.courtForms),
        estimatedDamages: pkg.estimatedDamages,
        createdAt: pkg.createdAt,
      },
    })
    .run();
}

export function getLitigationPackage(id: string): LitigationPackage | null {
  const row = db
    .select()
    .from(schema.litigationPackages)
    .where(eq(schema.litigationPackages.id, id))
    .get();
  if (!row) return null;

  const disputeIds = JSON.parse(row.disputeIds) as string[];
  const reconstructedDisputes: Dispute[] = [];
  for (const disputeId of disputeIds) {
    const dispute = getDispute(disputeId);
    if (dispute) reconstructedDisputes.push(dispute);
  }

  return {
    id: row.id,
    clientId: row.clientId,
    disputes: reconstructedDisputes,
    jurisdiction: JSON.parse(row.jurisdiction) as LitigationPackage["jurisdiction"],
    courtForms: JSON.parse(row.courtForms) as LitigationPackage["courtForms"],
    estimatedDamages: row.estimatedDamages,
    createdAt: row.createdAt,
  };
}
