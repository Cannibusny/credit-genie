// MODULE 2: MIXED FILE & DUPLICATE ACCOUNT DETECTOR
// Priority: CRITICAL | Expected Score Impact: +30 to +80 points
// Finds: Mixed files, duplicate collections, name/address mismatches

import type { CreditProfile, CreditAccount, MixedFileFlag, AdvisoryItem, Bureau } from "../types/index.js";
import { addAdvisory, mixedFileFlags } from "../lib/store.js";

interface MixedFileResult {
  flags: MixedFileFlag[];
  advisories: AdvisoryItem[];
  summary: string;
}

export function runMixedFileDetector(profile: CreditProfile): MixedFileResult {
  const result: MixedFileResult = { flags: [], advisories: [], summary: "" };
  const now = new Date();
  const userAddresses = profile.addresses.map(a => `${a.street} ${a.city} ${a.state}`.toLowerCase());
  const userName = `${profile.firstName} ${profile.lastName}`.toLowerCase();

  // 1. Cross-bureau reference: same account, different data
  const accountsByCreditor = groupAccountsByCreditor(profile.accounts);
  for (const [creditor, accounts] of accountsByCreditor) {
    if (accounts.length > 1) {
      checkDuplicateCollections(accounts, profile, result, now);
    }
  }

  // 2. Flag negative accounts on only one bureau
  const negativeAccounts = profile.accounts.filter(a => a.isNegative);
  for (const account of negativeAccounts) {
    if (account.bureaus.length === 1) {
      const flag: MixedFileFlag = {
        id: `mf-single-${account.id}-${now.getTime()}`,
        profileId: profile.id,
        accountId: account.id,
        reason: "single_bureau_negative",
        details: `${account.creditorName} appears as negative on ${account.bureaus[0]} only. Not on other bureaus — probable mixed file.`,
        affectedBureaus: account.bureaus,
        disputeStrategy: "Dispute with single bureau using identity affidavit. This account may belong to someone with a similar name or SSN.",
        identityDocsRequired: ["government_id", "utility_bill", "ssn_card"],
        severity: "critical",
        resolved: false,
        resolvedAt: null,
      };
      result.flags.push(flag);

      result.advisories.push({
        id: `adv-mf-single-${account.id}-${now.getTime()}`,
        profileId: profile.id,
        module: "mixed_file_detector",
        priority: "critical",
        condition: `Collection "${account.creditorName}" appears on ${account.bureaus[0]} only — not on other bureaus`,
        action: "Dispute as probable mixed file with identity affidavit. Send to single bureau.",
        specificDetails: `${account.creditorName} — $${account.balance ?? 0} balance. Only on ${account.bureaus[0]}. Gather: gov ID, utility bill, SSN card.`,
        expectedImpact: "+30-80 points if removed",
        bureau: account.bureaus[0] ?? "equifax",
        timeframe: "30-45 days",
        status: "active",
        createdAt: now.toISOString(),
      });
    }
  }

  // 3. Check for address mismatches (accounts with addresses user never lived at)
  for (const account of profile.accounts) {
    if (!account.isNegative) continue;
    // Check bureau-level remarks for addresses
    for (const remark of account.remarks) {
      const remarkLower = remark.toLowerCase();
      const hasUnknownAddress = !userAddresses.some(addr => remarkLower.includes(addr));
      if (remarkLower.includes("address") && hasUnknownAddress) {
        const flag: MixedFileFlag = {
          id: `mf-addr-${account.id}-${now.getTime()}`,
          profileId: profile.id,
          accountId: account.id,
          reason: "address_mismatch",
          details: `${account.creditorName} associated with an address user has never lived at.`,
          affectedBureaus: account.bureaus,
          disputeStrategy: "Dispute as identity error. Provide utility bill or government ID showing your actual address.",
          identityDocsRequired: ["utility_bill", "government_id"],
          severity: "high",
          resolved: false,
          resolvedAt: null,
        };
        result.flags.push(flag);
      }
    }
  }

  // 4. Name variant detection
  for (const account of negativeAccounts) {
    for (const [bureau, data] of Object.entries(account.bureauData)) {
      if (data && data.remarks) {
        for (const remark of data.remarks) {
          if (containsNameVariant(remark, userName)) {
            const flag: MixedFileFlag = {
              id: `mf-name-${account.id}-${bureau}-${now.getTime()}`,
              profileId: profile.id,
              accountId: account.id,
              reason: "name_mismatch",
              details: `${account.creditorName} on ${bureau} shows a name variant that doesn't match user's legal name.`,
              affectedBureaus: [bureau as Bureau],
              disputeStrategy: "Document name discrepancy, dispute as 'not mine' with identity documentation.",
              identityDocsRequired: ["government_id", "ssn_card"],
              severity: "high",
              resolved: false,
              resolvedAt: null,
            };
            result.flags.push(flag);
          }
        }
      }
    }
  }

  // Store flags
  const existing = mixedFileFlags.get(profile.id) ?? [];
  mixedFileFlags.set(profile.id, [...existing, ...result.flags]);

  // Store advisories
  for (const adv of result.advisories) {
    addAdvisory(profile.id, adv);
  }

  result.summary = result.flags.length > 0
    ? `Found ${result.flags.length} potential mixed file/duplicate issue(s). ${result.flags.filter(f => f.severity === "critical").length} critical.`
    : "No mixed file or duplicate account issues detected.";

  return result;
}

function groupAccountsByCreditor(accounts: CreditAccount[]): Map<string, CreditAccount[]> {
  const map = new Map<string, CreditAccount[]>();
  for (const account of accounts) {
    const key = normalizeCreditorName(account.creditorName);
    const existing = map.get(key) ?? [];
    existing.push(account);
    map.set(key, existing);
  }
  return map;
}

function normalizeCreditorName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(llc|inc|corp|co)$/g, "");
}

function checkDuplicateCollections(accounts: CreditAccount[], profile: CreditProfile, result: MixedFileResult, now: Date): void {
  const collections = accounts.filter(a => a.accountType === "collection");
  if (collections.length < 2) return;

  // Two different collection agencies reporting same debt
  const agencies = new Set(collections.map(a => a.collectionAgency ?? a.creditorName));
  if (agencies.size > 1) {
    const flag: MixedFileFlag = {
      id: `mf-dup-${collections[0]?.id}-${now.getTime()}`,
      profileId: profile.id,
      accountId: collections[0]?.id ?? "",
      reason: "duplicate_collection",
      details: `Same debt reported by ${agencies.size} different collection agencies: ${Array.from(agencies).join(", ")}. Both cannot be valid.`,
      affectedBureaus: [...new Set(collections.flatMap(c => c.bureaus))],
      disputeStrategy: "Dispute both simultaneously with debt validation letter. Two agencies cannot legally collect the same debt.",
      identityDocsRequired: [],
      severity: "critical",
      resolved: false,
      resolvedAt: null,
    };
    result.flags.push(flag);

    result.advisories.push({
      id: `adv-mf-dup-${collections[0]?.id}-${now.getTime()}`,
      profileId: profile.id,
      module: "mixed_file_detector",
      priority: "critical",
      condition: `Same debt from ${agencies.size} different collectors: ${Array.from(agencies).join(", ")}`,
      action: "Dispute both simultaneously with debt validation letter — both cannot be valid",
      specificDetails: collections.map(c => `${c.collectionAgency ?? c.creditorName}: $${c.balance ?? 0} on ${c.bureaus.join(", ")}`).join(" | "),
      expectedImpact: "+15-40 points per removal",
      bureau: "all",
      timeframe: "30-45 days",
      status: "active",
      createdAt: now.toISOString(),
    });
  }
}

function containsNameVariant(text: string, userName: string): boolean {
  const suffixes = ["jr", "sr", "ii", "iii", "iv"];
  const textLower = text.toLowerCase();
  const parts = userName.split(" ");
  const lastName = parts[parts.length - 1] ?? "";
  if (textLower.includes(lastName) && !textLower.includes(userName)) {
    return true;
  }
  for (const suffix of suffixes) {
    const suffixPattern = new RegExp(`\\b${suffix}\\b`, "i");
    if (suffixPattern.test(textLower) && !suffixPattern.test(userName)) {
      return true;
    }
  }
  return false;
}
