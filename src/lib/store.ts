import type {
  AuditResult, Dispute, DisputeTemplate, GeneratedDocument,
  Client, ScoreEntry, ScoreGoal, ManualAccount, Alert,
  VaultDocument, Lead, ClientWorkflow, LitigationPackage,
} from "../types/index.js";

// In-memory stores shared between route modules.
// In production, swap for Supabase.

export const audits = new Map<string, AuditResult>();
export const disputes = new Map<string, Dispute[]>();
export const generatedLetters = new Map<string, GeneratedDocument[]>();
export const disputeTemplates = new Map<string, DisputeTemplate>();

// ─── New stores ─────────────────────────────────────────────────────────────

export const clients = new Map<string, Client>();
export const scoreEntries = new Map<string, ScoreEntry[]>(); // keyed by clientId
export const scoreGoals = new Map<string, ScoreGoal>(); // keyed by clientId
export const manualAccounts = new Map<string, ManualAccount[]>(); // keyed by clientId
export const alerts = new Map<string, Alert[]>(); // keyed by clientId
export const vaultDocuments = new Map<string, Buffer>(); // keyed by document id
export const leads = new Map<string, Lead>();
export const workflows = new Map<string, ClientWorkflow>(); // keyed by clientId
export const litigationPackages = new Map<string, LitigationPackage>();

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

/** Get or create a client record. */
export function getOrCreateClient(id: string, defaults: Partial<Client> = {}): Client {
  let client = clients.get(id);
  if (!client) {
    client = {
      id,
      email: defaults.email ?? "",
      name: defaults.name ?? "",
      phone: defaults.phone ?? null,
      ssn: defaults.ssn ?? null,
      dob: defaults.dob ?? null,
      street: defaults.street ?? null,
      city: defaults.city ?? null,
      state: defaults.state ?? "",
      county: defaults.county ?? "",
      zip: defaults.zip ?? null,
      notes: [],
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    clients.set(id, client);
  }
  return client;
}

/** Add a score entry for a client. */
export function addScoreEntry(entry: ScoreEntry): void {
  const existing = scoreEntries.get(entry.clientId) ?? [];
  existing.push(entry);
  scoreEntries.set(entry.clientId, existing);
}

/** Add an alert for a client. */
export function addAlert(alert: Alert): void {
  const existing = alerts.get(alert.clientId) ?? [];
  existing.push(alert);
  alerts.set(alert.clientId, existing);
}

/** Add a manual account for a client. */
export function addManualAccount(account: ManualAccount): void {
  const existing = manualAccounts.get(account.clientId) ?? [];
  existing.push(account);
  manualAccounts.set(account.clientId, existing);
}
