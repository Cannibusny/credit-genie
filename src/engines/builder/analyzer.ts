import type {
  CashFlowAnalysis,
  CreditBuildingRecommendation,
} from "../../types/index.js";
import { log } from "../../lib/logger.js";

// ─── Credit Building Product Database ────────────────────────────────────────

interface CreditProduct {
  type: CreditBuildingRecommendation["type"];
  provider: string;
  description: string;
  estimatedScoreImpact: number;
  monthlyCost: number | null;
  requirements: string[];
  minMonthlyIncome: number;
  minCashFlow: number; // net income after expenses
}

const creditProducts: CreditProduct[] = [
  // Rent Reporting — immediate tradeline with no new debt
  {
    type: "rent_reporting",
    provider: "Boom Pay",
    description: "Report your rent payments to all 3 bureaus. Creates a Primary Tradeline instantly from existing on-time payments.",
    estimatedScoreImpact: 25,
    monthlyCost: 2,
    requirements: ["Active lease or rental agreement", "Monthly rent payment history"],
    minMonthlyIncome: 0,
    minCashFlow: 0,
  },
  {
    type: "rent_reporting",
    provider: "RentTrack",
    description: "Automated rent reporting to TransUnion and Equifax. Retroactive reporting available for up to 24 months.",
    estimatedScoreImpact: 30,
    monthlyCost: 7,
    requirements: ["Verifiable rent payments", "Landlord or property manager participation"],
    minMonthlyIncome: 0,
    minCashFlow: 50,
  },

  // Utility & Subscription Reporting
  {
    type: "utility_reporting",
    provider: "Experian Boost",
    description: "Free — links bank account to report utility, phone, and streaming payments to Experian.",
    estimatedScoreImpact: 15,
    monthlyCost: 0,
    requirements: ["Bank account with utility/streaming payments"],
    minMonthlyIncome: 0,
    minCashFlow: 0,
  },
  {
    type: "streaming_reporting",
    provider: "UltraFICO",
    description: "Uses checking/savings account history to supplement FICO score. Reports banking behavior, not just credit.",
    estimatedScoreImpact: 20,
    monthlyCost: 0,
    requirements: ["Checking or savings account with 3+ months history", "Positive balance history"],
    minMonthlyIncome: 0,
    minCashFlow: 100,
  },

  // Secured Cards — step into real revolving credit
  {
    type: "secured_card",
    provider: "Discover it Secured",
    description: "Secured card with cash-back rewards. Graduates to unsecured after 8 months. Reports to all 3 bureaus.",
    estimatedScoreImpact: 35,
    monthlyCost: null,
    requirements: ["$200 security deposit", "No recent bankruptcies"],
    minMonthlyIncome: 1000,
    minCashFlow: 200,
  },
  {
    type: "secured_card",
    provider: "Capital One Platinum Secured",
    description: "No annual fee secured card. Potential credit line increase with on-time payments. Reports to all 3 bureaus.",
    estimatedScoreImpact: 30,
    monthlyCost: null,
    requirements: ["$49-$200 security deposit"],
    minMonthlyIncome: 800,
    minCashFlow: 100,
  },

  // Credit Builder Loans
  {
    type: "credit_builder_loan",
    provider: "Self (formerly Self Lender)",
    description: "Credit builder loan — payments held in CD. Builds installment loan history. Funds released at end of term.",
    estimatedScoreImpact: 40,
    monthlyCost: 25,
    requirements: ["$25-$150/month payment capacity", "Bank account for autopay"],
    minMonthlyIncome: 1000,
    minCashFlow: 150,
  },
  {
    type: "credit_builder_loan",
    provider: "MoneyLion Credit Builder Plus",
    description: "0% APR credit builder loan up to $1,000. Reports to all 3 bureaus. Includes financial tracking.",
    estimatedScoreImpact: 35,
    monthlyCost: 20,
    requirements: ["Direct deposit or linked bank account"],
    minMonthlyIncome: 800,
    minCashFlow: 100,
  },

  // Authorized User
  {
    type: "authorized_user",
    provider: "Authorized User Strategy",
    description: "Get added to a family member's aged, high-limit card. Inherits full payment history immediately.",
    estimatedScoreImpact: 50,
    monthlyCost: 0,
    requirements: ["Trusted family member with good credit", "Card issuer that reports authorized users"],
    minMonthlyIncome: 0,
    minCashFlow: 0,
  },
];

// ─── Cash Flow Analysis ──────────────────────────────────────────────────────

export interface BankTransaction {
  date: string;
  amount: number;
  description: string;
  category: string;
}

export function analyzeCashFlow(
  clientId: string,
  transactions: BankTransaction[],
  rentAmount?: number,
): CashFlowAnalysis {
  let totalIncome = 0;
  let totalExpenses = 0;
  const subscriptions: { name: string; amount: number }[] = [];
  let utilityTotal = 0;
  const months = new Set<string>();

  for (const tx of transactions) {
    const month = tx.date.substring(0, 7);
    months.add(month);

    if (tx.amount > 0) {
      totalIncome += tx.amount;
    } else {
      totalExpenses += Math.abs(tx.amount);

      const lower = tx.description.toLowerCase();
      if (
        lower.includes("netflix") ||
        lower.includes("spotify") ||
        lower.includes("hulu") ||
        lower.includes("disney") ||
        lower.includes("hbo") ||
        lower.includes("apple tv") ||
        lower.includes("youtube")
      ) {
        const existing = subscriptions.find((s) => s.name.toLowerCase() === lower);
        if (!existing) {
          subscriptions.push({ name: tx.description, amount: Math.abs(tx.amount) });
        }
      }

      if (
        lower.includes("electric") ||
        lower.includes("gas") ||
        lower.includes("water") ||
        lower.includes("utility") ||
        lower.includes("power")
      ) {
        utilityTotal += Math.abs(tx.amount);
      }
    }
  }

  const monthCount = Math.max(months.size, 1);
  const monthlyIncome = Math.round(totalIncome / monthCount);
  const monthlyExpenses = Math.round(totalExpenses / monthCount);
  const monthlyUtilities = Math.round(utilityTotal / monthCount);
  const netCashFlow = monthlyIncome - monthlyExpenses;

  const recommendations = matchProducts(monthlyIncome, netCashFlow, rentAmount);

  log.info(
    { clientId, monthlyIncome, monthlyExpenses, netCashFlow, products: recommendations.length },
    "Cash flow analysis complete",
  );

  return {
    clientId,
    monthlyIncome,
    monthlyExpenses,
    rentPayment: rentAmount ?? null,
    utilityPayments: monthlyUtilities,
    subscriptions,
    creditCapacity: Math.max(0, Math.round(netCashFlow * 0.3)),
    recommendations,
  };
}

// ─── Product Matching ────────────────────────────────────────────────────────

function matchProducts(
  monthlyIncome: number,
  netCashFlow: number,
  rentAmount?: number,
): CreditBuildingRecommendation[] {
  const matched: CreditBuildingRecommendation[] = [];

  for (const product of creditProducts) {
    if (monthlyIncome < product.minMonthlyIncome) continue;
    if (netCashFlow < product.minCashFlow) continue;
    if (product.type === "rent_reporting" && !rentAmount) continue;

    matched.push({
      type: product.type,
      provider: product.provider,
      description: product.description,
      estimatedScoreImpact: product.estimatedScoreImpact,
      monthlyCost: product.monthlyCost,
      requirements: product.requirements,
    });
  }

  matched.sort((a, b) => b.estimatedScoreImpact - a.estimatedScoreImpact);
  return matched;
}

export function generateBuildingPlan(analysis: CashFlowAnalysis): string {
  const lines: string[] = [
    "═══════════════════════════════════════════════════",
    "  CREDIT GENIE — CREDIT BUILDING STRATEGY",
    "═══════════════════════════════════════════════════",
    "",
    `Monthly Income:    $${analysis.monthlyIncome.toLocaleString()}`,
    `Monthly Expenses:  $${analysis.monthlyExpenses.toLocaleString()}`,
    `Net Cash Flow:     $${(analysis.monthlyIncome - analysis.monthlyExpenses).toLocaleString()}`,
    `Credit Capacity:   $${analysis.creditCapacity.toLocaleString()}`,
    "",
  ];

  if (analysis.rentPayment) {
    lines.push(`Rent Payment:      $${analysis.rentPayment.toLocaleString()} (reportable!)`);
  }
  if (analysis.utilityPayments > 0) {
    lines.push(`Utility Payments:  $${analysis.utilityPayments.toLocaleString()} (reportable!)`);
  }
  if (analysis.subscriptions.length > 0) {
    lines.push(`Subscriptions:     ${analysis.subscriptions.map((s) => s.name).join(", ")} (reportable via Experian Boost)`);
  }

  lines.push("", "─── RECOMMENDED ACTIONS (by impact) ─────────────", "");

  for (let i = 0; i < analysis.recommendations.length; i++) {
    const rec = analysis.recommendations[i]!;
    const cost = rec.monthlyCost === null ? "One-time deposit" : rec.monthlyCost === 0 ? "FREE" : `$${rec.monthlyCost}/mo`;
    lines.push(
      `${i + 1}. ${rec.provider} (+${rec.estimatedScoreImpact} pts est.)`,
      `   Type: ${rec.type.replace(/_/g, " ")}`,
      `   Cost: ${cost}`,
      `   ${rec.description}`,
      `   Requirements: ${rec.requirements.join("; ")}`,
      "",
    );
  }

  const totalImpact = analysis.recommendations.reduce((s, r) => s + r.estimatedScoreImpact, 0);
  lines.push(
    "═══════════════════════════════════════════════════",
    `  TOTAL ESTIMATED SCORE IMPACT: +${totalImpact} points`,
    "═══════════════════════════════════════════════════",
  );

  return lines.join("\n");
}
