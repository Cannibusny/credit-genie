import type {
  CreditProfile, GeneratedDocument, DisputeTemplate,
  Alert, VaultDocument, DisputeCalendar, AdvisoryItem,
  SnapshotAlert, MixedFileFlag, CollectionAnalysis,
  AUAuditResult, DormantAlert, MedicalDebtAction,
  MoVDemand, RegulatoryEscalation, UpsellTrigger,
  OnboardingState, CROAContract, Bureau, BureauProfile,
} from "../types/index.js";

// ─── In-memory stores ─────────────────────────────────────────────────────────
// In production, swap for Supabase.

// Core: Unified Credit Profiles
export const profiles = new Map<string, CreditProfile>();

// Documents & Templates
export const generatedDocuments = new Map<string, GeneratedDocument[]>(); // by profileId
export const disputeTemplates = new Map<string, DisputeTemplate>();
export const vaultFiles = new Map<string, Buffer>(); // by document id

// Module state
export const disputeCalendars = new Map<string, DisputeCalendar>(); // by profileId
export const advisoryItems = new Map<string, AdvisoryItem[]>(); // by profileId
export const snapshotAlerts = new Map<string, SnapshotAlert[]>(); // by profileId
export const mixedFileFlags = new Map<string, MixedFileFlag[]>(); // by profileId
export const collectionAnalyses = new Map<string, CollectionAnalysis[]>(); // by profileId
export const auAuditResults = new Map<string, AUAuditResult[]>(); // by profileId
export const dormantAlerts = new Map<string, DormantAlert[]>(); // by profileId
export const medicalDebtActions = new Map<string, MedicalDebtAction[]>(); // by profileId
export const movDemands = new Map<string, MoVDemand[]>(); // by profileId
export const escalations = new Map<string, RegulatoryEscalation[]>(); // by profileId

// Business layer
export const alerts = new Map<string, Alert[]>(); // by profileId
export const upsellTriggers = new Map<string, UpsellTrigger[]>(); // by profileId
export const onboardingStates = new Map<string, OnboardingState>();
export const croaContracts = new Map<string, CROAContract>();

// ─── Default Bureau Profiles ────────────────────────────────────────────────

export function getDefaultBureauProfiles(): Record<Bureau, BureauProfile> {
  return {
    equifax: {
      bureau: "equifax",
      avgResponseDays: 32,
      reliefRate: 8.2,
      preferredChannel: "online",
      investigationWindow: 45,
      notes: "45-day window on certain item types. Mid-tier relief rate. Responds to both online and certified mail.",
      disputesSent: 0,
      disputesWon: 0,
      disputesVerified: 0,
      frivolousRejections: 0,
      lastUpdated: new Date().toISOString(),
    },
    experian: {
      bureau: "experian",
      avgResponseDays: 22,
      reliefRate: 0.8,
      preferredChannel: "certified_mail",
      investigationWindow: 30,
      notes: "Fastest response but lowest relief rate (below 1% in 2025). Favors documentation-heavy packages. Certified mail disputes harder to reject as frivolous.",
      disputesSent: 0,
      disputesWon: 0,
      disputesVerified: 0,
      frivolousRejections: 0,
      lastUpdated: new Date().toISOString(),
    },
    transunion: {
      bureau: "transunion",
      avgResponseDays: 28,
      reliefRate: 4.1,
      preferredChannel: "certified_mail",
      investigationWindow: 30,
      notes: "Relief rate down 50% in 2025. Requires persistent follow-up. Responds better to certified mail. Often needs multiple rounds.",
      disputesSent: 0,
      disputesWon: 0,
      disputesVerified: 0,
      frivolousRejections: 0,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ─── Helper functions ───────────────────────────────────────────────────────

export function getProfile(id: string): CreditProfile | undefined {
  return profiles.get(id);
}

export function getAllProfiles(): CreditProfile[] {
  return Array.from(profiles.values());
}

export function getProfilesByUser(userId: string): CreditProfile[] {
  return Array.from(profiles.values()).filter(p => p.userId === userId);
}

export function getProfileForUser(id: string, userId: string): CreditProfile | undefined {
  const profile = profiles.get(id);
  if (!profile || profile.userId !== userId) return undefined;
  return profile;
}

export function createProfile(profile: CreditProfile): CreditProfile {
  profiles.set(profile.id, profile);
  return profile;
}

export function updateProfile(id: string, updater: (p: CreditProfile) => CreditProfile): CreditProfile | null {
  const existing = profiles.get(id);
  if (!existing) return null;
  const updated = updater(existing);
  profiles.set(id, updated);
  return updated;
}

export function addAdvisory(profileId: string, item: AdvisoryItem): void {
  const existing = advisoryItems.get(profileId) ?? [];
  existing.push(item);
  advisoryItems.set(profileId, existing);
}

export function addAlert(profileId: string, alert: Alert): void {
  const existing = alerts.get(profileId) ?? [];
  existing.push(alert);
  alerts.set(profileId, existing);
}

export function addDocument(profileId: string, doc: GeneratedDocument): void {
  const existing = generatedDocuments.get(profileId) ?? [];
  existing.push(doc);
  generatedDocuments.set(profileId, existing);
}
