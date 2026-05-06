import { Router } from "express";
import { analyzeCashFlow, generateBuildingPlan } from "../engines/builder/index.js";
import type { BankTransaction } from "../engines/builder/index.js";

export const builderRouter = Router();

// ─── POST /api/builder/analyze — Analyze cash flow & recommend products ──────

builderRouter.post("/analyze", (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: "Cash flow analysis failed." });
  }
});

// ─── POST /api/builder/quick — Quick recommendation without full bank data ───

builderRouter.post("/quick", (req, res) => {
  try {
    const body = req.body as {
      monthlyIncome?: number;
      monthlyRent?: number;
      hasUtilities?: boolean;
      hasStreaming?: boolean;
      creditScore?: number;
    };

    const income = body.monthlyIncome ?? 3000;
    const rent = body.monthlyRent;

    // Synthesize minimal transactions to drive the analyzer
    const transactions: BankTransaction[] = [];
    const now = new Date();

    for (let m = 0; m < 3; m++) {
      const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const dateStr = month.toISOString().substring(0, 10);

      // Income deposits
      transactions.push({ date: dateStr, amount: income, description: "Direct Deposit - Payroll", category: "income" });

      // Rent if provided
      if (rent) {
        transactions.push({ date: dateStr, amount: -rent, description: "Rent Payment", category: "housing" });
      }

      // Utilities
      if (body.hasUtilities) {
        transactions.push({ date: dateStr, amount: -120, description: "Electric Company", category: "utility" });
        transactions.push({ date: dateStr, amount: -45, description: "Gas Utility", category: "utility" });
      }

      // Streaming
      if (body.hasStreaming) {
        transactions.push({ date: dateStr, amount: -15.99, description: "Netflix", category: "entertainment" });
        transactions.push({ date: dateStr, amount: -10.99, description: "Spotify", category: "entertainment" });
      }

      // General expenses
      transactions.push({ date: dateStr, amount: -(income * 0.3), description: "General Expenses", category: "other" });
    }

    const analysis = analyzeCashFlow("quick-analysis", transactions, rent);
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
  } catch (err) {
    res.status(500).json({ error: "Quick analysis failed." });
  }
});
