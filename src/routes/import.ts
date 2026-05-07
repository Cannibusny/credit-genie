// Credit Report Import — text paste and PDF upload (auth-gated, user-scoped)
import { Router } from "express";
import multer from "multer";
import type { CreditAccount, Bureau } from "../types/index.js";
import { getProfileForUser, updateProfile } from "../lib/store.js";
import { parseReportText } from "../modules/report-parser.js";
import { requireAuth } from "../middleware/auth.js";

export const importRouter = Router();

// All import routes require authentication
importRouter.use(requireAuth as any);

// Multer config for PDF uploads (stored in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "text/plain", "text/html"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, and HTML files are accepted"));
    }
  },
});

// POST /api/import/:profileId/text — paste raw report text
importRouter.post("/:profileId/text", (req, res) => {
  const profile = getProfileForUser(req.params.profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const { text, bureau } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Provide 'text' field with your credit report text" });
  }

  const parsed = parseReportText(text, (bureau as Bureau) ?? "equifax");

  const newAccounts: CreditAccount[] = parsed.accounts.map((partial, idx) => ({
    id: `acct-import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    creditorName: partial.creditorName ?? "Unknown",
    accountNumber: partial.accountNumber ?? "",
    accountType: partial.accountType ?? "revolving",
    accountStatus: partial.accountStatus ?? "unknown",
    balance: partial.balance ?? null,
    creditLimit: partial.creditLimit ?? null,
    highBalance: partial.highBalance ?? null,
    monthlyPayment: partial.monthlyPayment ?? null,
    dateOpened: partial.dateOpened ?? null,
    dateClosed: partial.dateClosed ?? null,
    dateReported: partial.dateReported ?? null,
    dateOfLastActivity: partial.dateOfLastActivity ?? null,
    dateOfFirstDelinquency: partial.dateOfFirstDelinquency ?? null,
    paymentHistory: partial.paymentHistory ?? [],
    remarks: partial.remarks ?? [],
    originalCreditor: partial.originalCreditor ?? null,
    collectionAgency: partial.collectionAgency ?? null,
    metro2SegmentId: null,
    bureaus: partial.bureaus ?? [parsed.bureau ?? "equifax"],
    bureauData: {},
    snapshotDate: partial.snapshotDate ?? null,
    paymentDueDate: partial.paymentDueDate ?? null,
    lastTransactionDate: partial.lastTransactionDate ?? null,
    isAuthorizedUser: partial.isAuthorizedUser ?? false,
    primaryHolderName: partial.primaryHolderName ?? null,
    isNegative: partial.isNegative ?? false,
    negativeReason: partial.negativeReason ?? null,
    isMedical: partial.isMedical ?? false,
    isDisputed: false,
    source: "import",
  }));

  const updated = updateProfile(profile.id, (p) => {
    const existingKeys = new Set(p.accounts.map(a => `${a.creditorName}|${a.accountNumber}`));
    const toAdd = newAccounts.filter(a => !existingKeys.has(`${a.creditorName}|${a.accountNumber}`));
    return {
      ...p,
      accounts: [...p.accounts, ...toAdd],
      updatedAt: new Date().toISOString(),
    };
  });

  res.json({
    success: true,
    bureau: parsed.bureau,
    accountsFound: parsed.accounts.length,
    accountsImported: (updated?.accounts.length ?? 0) - profile.accounts.length,
    personalInfo: parsed.personalInfo,
    errors: parsed.errors,
    totalAccounts: updated?.accounts.length ?? 0,
  });
});

// POST /api/import/:profileId/pdf — upload PDF credit report
importRouter.post("/:profileId/pdf", upload.single("file"), async (req, res) => {
  const profileId = Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId;
  const profile = getProfileForUser(profileId ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const file = req.file;
  if (!file) return res.status(400).json({ error: "No file uploaded. Use form field name 'file'." });

  let text: string;

  if (file.mimetype === "text/plain" || file.mimetype === "text/html") {
    text = file.buffer.toString("utf-8");
  } else {
    try {
      const pdfParse = await import("pdf-parse");
      const pdfData = await pdfParse.default(file.buffer);
      text = pdfData.text;
    } catch (err) {
      return res.status(422).json({
        error: "Could not parse PDF. Try saving your credit report as a text file, or copy-paste the text directly using the /text endpoint.",
        details: String(err),
      });
    }
  }

  const bureau = (req.body?.bureau as Bureau) ?? "equifax";
  const parsed = parseReportText(text, bureau);

  const newAccounts: CreditAccount[] = parsed.accounts.map((partial, idx) => ({
    id: `acct-import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    creditorName: partial.creditorName ?? "Unknown",
    accountNumber: partial.accountNumber ?? "",
    accountType: partial.accountType ?? "revolving",
    accountStatus: partial.accountStatus ?? "unknown",
    balance: partial.balance ?? null,
    creditLimit: partial.creditLimit ?? null,
    highBalance: partial.highBalance ?? null,
    monthlyPayment: partial.monthlyPayment ?? null,
    dateOpened: partial.dateOpened ?? null,
    dateClosed: partial.dateClosed ?? null,
    dateReported: partial.dateReported ?? null,
    dateOfLastActivity: partial.dateOfLastActivity ?? null,
    dateOfFirstDelinquency: partial.dateOfFirstDelinquency ?? null,
    paymentHistory: partial.paymentHistory ?? [],
    remarks: partial.remarks ?? [],
    originalCreditor: partial.originalCreditor ?? null,
    collectionAgency: partial.collectionAgency ?? null,
    metro2SegmentId: null,
    bureaus: partial.bureaus ?? [parsed.bureau ?? bureau],
    bureauData: {},
    snapshotDate: partial.snapshotDate ?? null,
    paymentDueDate: partial.paymentDueDate ?? null,
    lastTransactionDate: partial.lastTransactionDate ?? null,
    isAuthorizedUser: partial.isAuthorizedUser ?? false,
    primaryHolderName: partial.primaryHolderName ?? null,
    isNegative: partial.isNegative ?? false,
    negativeReason: partial.negativeReason ?? null,
    isMedical: partial.isMedical ?? false,
    isDisputed: false,
    source: "import",
  }));

  const updated = updateProfile(profile.id, (p) => {
    const existingKeys = new Set(p.accounts.map(a => `${a.creditorName}|${a.accountNumber}`));
    const toAdd = newAccounts.filter(a => !existingKeys.has(`${a.creditorName}|${a.accountNumber}`));
    return {
      ...p,
      accounts: [...p.accounts, ...toAdd],
      updatedAt: new Date().toISOString(),
    };
  });

  res.json({
    success: true,
    bureau: parsed.bureau,
    fileName: file.originalname,
    accountsFound: parsed.accounts.length,
    accountsImported: (updated?.accounts.length ?? 0) - profile.accounts.length,
    personalInfo: parsed.personalInfo,
    errors: parsed.errors,
    totalAccounts: updated?.accounts.length ?? 0,
  });
});
