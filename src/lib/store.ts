import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  audits as auditsTable,
  disputes as disputesTable,
  generatedDocuments,
  litigationPackages,
} from "../db/schema.js";
import type {
  AccountMatch,
  AuditResult,
  Discrepancy,
  Dispute,
  DisputeTemplate,
  GeneratedDocument,
  LitigationPackage,
  ParsedCreditReport,
} from "../types/index.js";

// Reserved for the future `dispute_templates` SQLite table. Keeps the API
// surface stable so the in-memory templates can be migrated to a persistent
// store without consumer changes.
export const disputeTemplates = new Map<string, DisputeTemplate>();

// ─── Audits ──────────────────────────────────────────────────────────────────

export function saveAudit(audit: AuditResult): void {
  db.insert(auditsTable)
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
    .run();
}

export function getAudit(id: string): AuditResult | undefined {
  const row = db.select().from(auditsTable).where(eq(auditsTable.id, id)).get();
  if (!row) return undefined;
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

export function saveDisputes(_auditId: string, disputeList: Dispute[]): void {
  for (const d of disputeList) {
    db.insert(disputesTable)
      .values({
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
      })
      .run();
  }
}

export function getDisputesByAudit(auditId: string): Dispute[] | undefined {
  const rows = db.select().from(disputesTable).where(eq(disputesTable.auditId, auditId)).all();
  if (rows.length === 0) return undefined;
  return rows.map(rowToDispute);
}

export function updateDispute(
  disputeId: string,
  updater: (d: Dispute) => Dispute,
): Dispute | null {
  const row = db.select().from(disputesTable).where(eq(disputesTable.id, disputeId)).get();
  if (!row) return null;
  const updated = updater(rowToDispute(row));
  db.update(disputesTable)
    .set({
      status: updated.status,
      sentAt: updated.sentAt,
      responseDeadline: updated.responseDeadline,
      responseReceivedAt: updated.responseReceivedAt,
      responseContent: updated.responseContent,
      updatedAt: updated.updatedAt,
    })
    .where(eq(disputesTable.id, disputeId))
    .run();
  return updated;
}

function rowToDispute(row: typeof disputesTable.$inferSelect): Dispute {
  return {
    id: row.id,
    clientId: row.clientId,
    auditId: row.auditId,
    discrepancyId: row.discrepancyId,
    bureau: row.bureau as Dispute["bureau"],
    status: row.status as Dispute["status"],
    letterContent: row.letterContent,
    sentAt: row.sentAt,
    responseDeadline: row.responseDeadline,
    responseReceivedAt: row.responseReceivedAt,
    responseContent: row.responseContent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ─── Generated Documents (Letters) ───────────────────────────────────────────

export function saveLetters(auditId: string, letters: GeneratedDocument[]): void {
  for (const l of letters) {
    db.insert(generatedDocuments)
      .values({
        auditId,
        type: l.type,
        fileName: l.fileName,
        content: l.content,
        generatedAt: l.generatedAt,
      })
      .run();
  }
}

export function getLetters(auditId: string): GeneratedDocument[] | undefined {
  const rows = db
    .select()
    .from(generatedDocuments)
    .where(eq(generatedDocuments.auditId, auditId))
    .all();
  if (rows.length === 0) return undefined;
  return rows.map((r) => ({
    type: r.type as GeneratedDocument["type"],
    fileName: r.fileName,
    content: r.content,
    generatedAt: r.generatedAt,
  }));
}

// ─── Litigation Packages ─────────────────────────────────────────────────────

export function saveLitigationPackage(pkg: LitigationPackage): void {
  db.insert(litigationPackages)
    .values({
      id: pkg.id,
      clientId: pkg.clientId,
      disputeIds: JSON.stringify(pkg.disputes.map((d) => d.id)),
      jurisdiction: JSON.stringify(pkg.jurisdiction),
      courtForms: JSON.stringify(pkg.courtForms),
      estimatedDamages: pkg.estimatedDamages,
      createdAt: pkg.createdAt,
    })
    .run();
}

export function getLitigationPackage(id: string): LitigationPackage | undefined {
  const row = db
    .select()
    .from(litigationPackages)
    .where(eq(litigationPackages.id, id))
    .get();
  if (!row) return undefined;
  // Reconstruct the disputes array from stored IDs.
  const disputeIds = JSON.parse(row.disputeIds) as string[];
  const disputes: Dispute[] = [];
  for (const did of disputeIds) {
    const d = db.select().from(disputesTable).where(eq(disputesTable.id, did)).get();
    if (d) disputes.push(rowToDispute(d));
  }
  return {
    id: row.id,
    clientId: row.clientId,
    disputes,
    jurisdiction: JSON.parse(row.jurisdiction) as LitigationPackage["jurisdiction"],
    courtForms: JSON.parse(row.courtForms) as GeneratedDocument[],
    estimatedDamages: row.estimatedDamages,
    createdAt: row.createdAt,
  };
}
