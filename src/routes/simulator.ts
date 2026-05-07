import { Router } from "express";
import { scoreEntries, manualAccounts, clients } from "../lib/store.js";
import type { Bureau, SimulationResult, SimulationScenario, ScoreFactor, DTIAnalysis } from "../types/index.js";

export const simulatorRouter = Router();

// ─── FICO 8/9 Score Factor Weights ─────────────────────────────────────────

const FACTOR_WEIGHTS = {
  payment_history: 35,
  utilization: 30,
  age_of_credit: 15,
  credit_mix: 10,
  new_credit: 10,
} as const;

// ─── Simulate score changes ─────────────────────────────────────────────────

simulatorRouter.post("/predict", (req, res) => {
  const { clientId, scenarios, monthlyIncome } = req.body as {
    clientId: string;
    scenarios: SimulationScenario[];
    monthlyIncome?: number;
  };

  if (!clientId) return res.status(400).json({ error: "Client ID required" });

  const client = clients.get(clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  // Get latest scores
  const entries = scoreEntries.get(clientId) ?? [];
  const latestScores: Partial<Record<Bureau, number>> = {};
  for (const bureau of ["equifax", "experian", "transunion"] as Bureau[]) {
    const bureauEntries = entries.filter((e) => e.bureau === bureau).sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
    if (bureauEntries[0]) latestScores[bureau] = bureauEntries[0].score;
  }

  // Get accounts
  const accounts = manualAccounts.get(clientId) ?? [];
  const negativeItems = accounts.filter((a) => a.isNegative);
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const totalLimit = accounts.reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  // Calculate projected scores based on scenarios
  const projectedScores: Partial<Record<Bureau, number>> = { ...latestScores };
  const scoreDelta: Partial<Record<Bureau, number>> = {};
  let totalDelta = 0;

  for (const scenario of scenarios ?? []) {
    let impact = 0;
    switch (scenario.action) {
      case "remove_item": {
        const severity = negativeItems.length > 0 ? 25 : 10;
        impact = severity + Math.floor(Math.random() * 15);
        break;
      }
      case "pay_down": {
        const newUtil = scenario.targetBalance !== null && totalLimit > 0
          ? (scenario.targetBalance / totalLimit) * 100 : utilization;
        const utilDrop = utilization - newUtil;
        impact = Math.min(Math.floor(utilDrop * 0.8), 50);
        break;
      }
      case "add_tradeline":
        impact = 15 + Math.floor(Math.random() * 10);
        break;
      case "pay_off":
        impact = 20 + Math.floor(Math.random() * 15);
        break;
      case "dispute_inquiry":
        impact = 3 + Math.floor(Math.random() * 7);
        break;
    }
    totalDelta += impact;
  }

  for (const bureau of ["equifax", "experian", "transunion"] as Bureau[]) {
    const current = latestScores[bureau];
    if (current) {
      const jitter = Math.floor(Math.random() * 6) - 3;
      const projected = Math.min(850, current + totalDelta + jitter);
      projectedScores[bureau] = projected;
      scoreDelta[bureau] = projected - current;
    }
  }

  // Analyze score factors
  const factors: ScoreFactor[] = [
    {
      category: "payment_history",
      impact: negativeItems.some((a) => a.negativeReason?.includes("late")) ? "high_negative" : "positive",
      description: negativeItems.some((a) => a.negativeReason?.includes("late"))
        ? `${negativeItems.filter((a) => a.negativeReason?.includes("late")).length} late payment(s) dragging score down`
        : "No late payments detected",
      weight: FACTOR_WEIGHTS.payment_history,
    },
    {
      category: "utilization",
      impact: utilization > 50 ? "high_negative" : utilization > 30 ? "negative" : utilization > 10 ? "neutral" : "positive",
      description: `Credit utilization at ${utilization.toFixed(0)}%${utilization > 30 ? " — aim for under 30%" : ""}`,
      weight: FACTOR_WEIGHTS.utilization,
    },
    {
      category: "age_of_credit",
      impact: accounts.length < 3 ? "negative" : "neutral",
      description: accounts.length < 3 ? "Thin credit file — consider adding tradelines" : `${accounts.length} accounts on file`,
      weight: FACTOR_WEIGHTS.age_of_credit,
    },
    {
      category: "credit_mix",
      impact: new Set(accounts.map((a) => a.accountType)).size < 2 ? "negative" : "positive",
      description: `${new Set(accounts.map((a) => a.accountType)).size} account type(s) — mix of revolving + installment is ideal`,
      weight: FACTOR_WEIGHTS.credit_mix,
    },
    {
      category: "derogatory",
      impact: negativeItems.length > 3 ? "high_negative" : negativeItems.length > 0 ? "negative" : "positive",
      description: negativeItems.length > 0
        ? `${negativeItems.length} derogatory item(s): ${negativeItems.map((a) => a.negativeReason ?? a.accountStatus).join(", ")}`
        : "No derogatory marks",
      weight: 0,
    },
  ];

  // DTI Analysis
  let dtiAnalysis: DTIAnalysis | null = null;
  if (monthlyIncome && monthlyIncome > 0) {
    const totalMonthlyDebt = accounts.reduce((sum, a) => sum + (a.monthlyPayment ?? 0), 0);
    const currentDTI = (totalMonthlyDebt / monthlyIncome) * 100;
    const targetDTI = 36;

    const debtPayoffOrder = accounts
      .filter((a) => (a.balance ?? 0) > 0 && (a.monthlyPayment ?? 0) > 0)
      .sort((a, b) => (a.balance ?? 0) - (b.balance ?? 0))
      .map((a, i) => ({
        creditor: a.creditorName,
        balance: a.balance ?? 0,
        monthlyPayment: a.monthlyPayment ?? 0,
        priority: i + 1,
      }));

    const maxMortgagePayment = (monthlyIncome * (targetDTI / 100)) - totalMonthlyDebt;
    const borrowingPower = Math.max(0, maxMortgagePayment * 200);

    dtiAnalysis = {
      totalMonthlyDebt,
      monthlyIncome,
      currentDTI: Math.round(currentDTI * 10) / 10,
      targetDTI,
      debtPayoffOrder,
      borrowingPower: Math.round(borrowingPower),
    };
  }

  const result: SimulationResult = {
    clientId,
    currentScore: latestScores,
    projectedScore: projectedScores,
    scoreDelta,
    scenarios: scenarios ?? [],
    factors,
    dtiAnalysis,
  };

  return res.json(result);
});

// ─── Quick score factors analysis (no scenarios needed) ─────────────────────

simulatorRouter.get("/factors/:clientId", (req, res) => {
  const { clientId } = req.params;
  const accounts = manualAccounts.get(clientId) ?? [];
  const negativeItems = accounts.filter((a) => a.isNegative);
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const totalLimit = accounts.reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  const factors: ScoreFactor[] = [
    {
      category: "payment_history",
      impact: negativeItems.some((a) => a.negativeReason?.includes("late")) ? "high_negative" : "positive",
      description: negativeItems.some((a) => a.negativeReason?.includes("late"))
        ? `${negativeItems.filter((a) => a.negativeReason?.includes("late")).length} late payment(s)`
        : "Clean payment history",
      weight: FACTOR_WEIGHTS.payment_history,
    },
    {
      category: "utilization",
      impact: utilization > 50 ? "high_negative" : utilization > 30 ? "negative" : utilization > 10 ? "neutral" : "positive",
      description: `${utilization.toFixed(0)}% utilization${utilization > 30 ? " (aim for <30%)" : ""}`,
      weight: FACTOR_WEIGHTS.utilization,
    },
    {
      category: "age_of_credit",
      impact: accounts.length < 3 ? "negative" : "neutral",
      description: `${accounts.length} account(s) on file`,
      weight: FACTOR_WEIGHTS.age_of_credit,
    },
    {
      category: "credit_mix",
      impact: new Set(accounts.map((a) => a.accountType)).size < 2 ? "negative" : "positive",
      description: `${new Set(accounts.map((a) => a.accountType)).size} account type(s)`,
      weight: FACTOR_WEIGHTS.credit_mix,
    },
    {
      category: "new_credit",
      impact: "neutral",
      description: "Recent inquiries not tracked yet",
      weight: FACTOR_WEIGHTS.new_credit,
    },
  ];

  return res.json({ factors });
});
