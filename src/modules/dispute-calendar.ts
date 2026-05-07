// MODULE 3: STAGGERED DISPUTE CALENDAR & BUREAU BEHAVIOR PROFILER
// Priority: CRITICAL | Expected Score Impact: +20 to +60 points
// Never send disputes to all three bureaus simultaneously (unless mixed file).

import type { CreditProfile, CreditAccount, DisputeCalendar, DisputeCalendarEntry, AdvisoryItem, Bureau, DisputeCategory } from "../types/index.js";
import { addAdvisory, disputeCalendars } from "../lib/store.js";

interface CalendarResult {
  calendar: DisputeCalendar;
  advisories: AdvisoryItem[];
  summary: string;
}

// 4-month rolling window categories
const MONTH_CATEGORIES: Record<number, DisputeCategory[]> = {
  1: ["payment_history", "account_status", "collection"],
  2: ["credit_limit", "duplicate_listing", "medical_debt"],
  3: ["personal_info", "outdated_negative", "au_issue"],
  4: ["escalation_mov", "escalation_cfpb", "escalation_ag"],
};

export function buildDisputeCalendar(profile: CreditProfile): CalendarResult {
  const now = new Date();
  const result: CalendarResult = {
    calendar: {
      profileId: profile.id,
      startDate: now.toISOString(),
      entries: [],
      currentMonth: 1,
    },
    advisories: [],
    summary: "",
  };

  const negativeAccounts = profile.accounts.filter(a => a.isNegative);
  if (negativeAccounts.length === 0) {
    result.summary = "No negative items to dispute. Calendar is empty.";
    disputeCalendars.set(profile.id, result.calendar);
    return result;
  }

  // Categorize accounts by dispute type
  const categorized = categorizeAccounts(negativeAccounts, profile);

  // Build 4-month calendar
  for (let month = 1; month <= 4; month++) {
    const categories = MONTH_CATEGORIES[month] ?? [];
    for (const category of categories) {
      const accountsForCategory = categorized.get(category) ?? [];
      for (const account of accountsForCategory) {
        // Determine which bureau to target first (most inaccurate data)
        const targetBureau = selectTargetBureau(account, profile);
        const scheduledDate = new Date(now);
        scheduledDate.setMonth(scheduledDate.getMonth() + month - 1);
        // Stagger within month — space 7 days apart
        scheduledDate.setDate(scheduledDate.getDate() + (result.calendar.entries.filter(e => e.month === month).length * 7));

        const entry: DisputeCalendarEntry = {
          id: `cal-${profile.id}-${month}-${account.id}-${now.getTime()}`,
          profileId: profile.id,
          month,
          category,
          bureau: targetBureau,
          accountId: account.id,
          scheduledDate: scheduledDate.toISOString(),
          status: "scheduled",
          notes: `${account.creditorName} — ${category} dispute to ${targetBureau}`,
        };
        result.calendar.entries.push(entry);
      }
    }
  }

  // Generate advisory for staggering strategy
  if (negativeAccounts.length > 0) {
    const bureauCounts = countByBureau(negativeAccounts);
    const startBureau = getMostInaccurateBureau(negativeAccounts, profile);

    result.advisories.push({
      id: `adv-cal-strategy-${now.getTime()}`,
      profileId: profile.id,
      module: "dispute_calendar",
      priority: "high",
      condition: `${negativeAccounts.length} negative items across ${Object.keys(bureauCounts).length} bureau(s)`,
      action: `Start disputes with ${startBureau} (most inaccurate data). Stagger over 4 months.`,
      specificDetails: `Month 1: Payment history/status. Month 2: Limits/duplicates. Month 3: Personal info/outdated. Month 4: Escalation (MoV/CFPB).`,
      expectedImpact: "+20-60 points per removal",
      bureau: startBureau,
      timeframe: "4 months (full cycle)",
      status: "active",
      createdAt: now.toISOString(),
    });

    // IF item 6+ years old
    for (const account of negativeAccounts) {
      if (account.dateOfFirstDelinquency) {
        const dofd = new Date(account.dateOfFirstDelinquency);
        const monthsOld = (now.getTime() - dofd.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOld >= 72) { // 6+ years
          result.advisories.push({
            id: `adv-cal-aged-${account.id}-${now.getTime()}`,
            profileId: profile.id,
            module: "dispute_calendar",
            priority: "high",
            condition: `${account.creditorName} is ${Math.floor(monthsOld / 12)} years old — approaching 7-year FCRA window`,
            action: "Check state statute of limitations AND FCRA 7-year rule. May be time-barred.",
            specificDetails: `DOFD: ${account.dateOfFirstDelinquency}. FCRA removes at 7 years. If within 6 months of expiry, may wait it out.`,
            expectedImpact: "+10-50 points if time-barred",
            bureau: "all",
            timeframe: "Immediate dispute or wait for expiry",
            status: "active",
            createdAt: now.toISOString(),
          });
        }
      }
    }
  }

  // Store
  disputeCalendars.set(profile.id, result.calendar);
  for (const adv of result.advisories) {
    addAdvisory(profile.id, adv);
  }

  result.summary = `Built 4-month dispute calendar with ${result.calendar.entries.length} scheduled actions across ${negativeAccounts.length} negative items.`;
  return result;
}

function categorizeAccounts(accounts: CreditAccount[], profile: CreditProfile): Map<DisputeCategory, CreditAccount[]> {
  const map = new Map<DisputeCategory, CreditAccount[]>();

  for (const account of accounts) {
    let category: DisputeCategory;

    if (account.negativeReason === "late_payment" || account.negativeReason === "late_30" || account.negativeReason === "late_60") {
      category = "payment_history";
    } else if (account.accountType === "collection") {
      category = "collection";
    } else if (account.negativeReason === "charge_off") {
      category = "account_status";
    } else if (account.isAuthorizedUser) {
      category = "au_issue";
    } else if (account.isMedical) {
      category = "medical_debt";
    } else {
      category = "account_status";
    }

    const existing = map.get(category) ?? [];
    existing.push(account);
    map.set(category, existing);
  }

  return map;
}

function selectTargetBureau(account: CreditAccount, profile: CreditProfile): Bureau {
  // Start with bureau where the data is most inaccurate (lowest relief rate — harder to verify)
  // But also factor in bureau behavior
  if (account.bureaus.length === 1) return account.bureaus[0] ?? "equifax";

  // Prefer Equifax first (highest relief rate), then TransUnion, then Experian last
  const preferenceOrder: Bureau[] = ["equifax", "transunion", "experian"];
  for (const bureau of preferenceOrder) {
    if (account.bureaus.includes(bureau)) return bureau;
  }
  return account.bureaus[0] ?? "equifax";
}

function getMostInaccurateBureau(accounts: CreditAccount[], profile: CreditProfile): Bureau {
  const counts: Record<Bureau, number> = { equifax: 0, experian: 0, transunion: 0 };
  for (const account of accounts) {
    for (const bureau of account.bureaus) {
      counts[bureau]++;
    }
  }
  // Start with bureau that has most issues AND highest relief rate
  const reliefWeighted: [Bureau, number][] = [
    ["equifax", counts.equifax * profile.bureauProfile.equifax.reliefRate],
    ["transunion", counts.transunion * profile.bureauProfile.transunion.reliefRate],
    ["experian", counts.experian * profile.bureauProfile.experian.reliefRate],
  ];
  reliefWeighted.sort((a, b) => b[1] - a[1]);
  return reliefWeighted[0]?.[0] ?? "equifax";
}

function countByBureau(accounts: CreditAccount[]): Partial<Record<Bureau, number>> {
  const counts: Partial<Record<Bureau, number>> = {};
  for (const account of accounts) {
    for (const bureau of account.bureaus) {
      counts[bureau] = (counts[bureau] ?? 0) + 1;
    }
  }
  return counts;
}
