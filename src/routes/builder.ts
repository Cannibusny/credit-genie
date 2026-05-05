import { Router } from "express";
import { analyzeCashFlow, generateBuildingPlan } from "../engines/builder/index.js";
import type { BankTransaction } from "../engines/builder/index.js";

export const builderRouter = Router();

// ─── POST /api/builder/analyze — Analyze cash flow & recommend products ──────

builderRouter.post("/analyze", (req, res) => {
  const body = req.body as {
    clientId?: string;
    transactions?: BankTransaction[];
    rentAmount?: number;
  };

  if (!body.transactions || body.transactions.length === 0) {
    res.status(400).json({ error: "Provide bank transactions for analysis." });
    return;
  }

  const analysis = analyzeCashFlow(
    body.clientId ?? "anonymous",
    body.transactions,
    body.rentAmount,
  );

  const plan = generateBuildingPlan(analysis);

  res.json({
    analysis: {
      monthlyIncome: analysis.monthlyIncome,
      monthlyExpenses: analysis.monthlyExpenses,
      netCashFlow: analysis.monthlyIncome - analysis.monthlyExpenses,
      creditCapacity: analysis.creditCapacity,
      rentPayment: analysis.rentPayment,
      utilityPayments: analysis.utilityPayments,
      subscriptions: analysis.subscriptions,
    },
    recommendations: analysis.recommendations,
    plan,
  });
});
