// Profile CRUD — Unified Credit Profile management (auth-gated, user-scoped)
import { Router } from "express";
import type { CreditProfile, CreditAccount, ScoreEntry } from "../types/index.js";
import { createProfile, updateProfile, getProfilesByUser, getProfileForUser, getDefaultBureauProfiles } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";

export const profileRouter = Router();

// All profile routes require authentication
profileRouter.use(requireAuth as any);

// List profiles (only the logged-in user's profiles)
profileRouter.get("/", (req, res) => {
  const all = getProfilesByUser(req.userId!);
  res.json(all);
});

// Get single profile (only if owned by user)
profileRouter.get("/:id", (req, res) => {
  const profile = getProfileForUser(req.params.id ?? "", req.userId!);
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  res.json(profile);
});

// Create profile (onboarding screen 2)
profileRouter.post("/", (req, res) => {
  const { firstName, lastName, email, state, county, phone, goal } = req.body;
  if (!firstName || !lastName || !state) {
    return res.status(400).json({ error: "firstName, lastName, and state are required" });
  }

  const id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const profile: CreditProfile = {
    id,
    userId: req.userId!,
    firstName,
    lastName,
    email: email ?? req.userEmail ?? "",
    phone: phone ?? null,
    ssn: null,
    dob: null,
    state: state.toUpperCase(),
    county: county ?? "",
    addresses: [],
    goal: goal ?? null,
    tier: "free",
    accounts: [],
    disputes: [],
    bureauProfile: getDefaultBureauProfiles(),
    medicalDebts: [],
    ifthenLog: [],
    scores: [],
    scoreGoal: null,
    partnerIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  createProfile(profile);
  res.status(201).json(profile);
});

// Update profile (only if owned by user)
profileRouter.patch("/:id", (req, res) => {
  const existing = getProfileForUser(req.params.id ?? "", req.userId!);
  if (!existing) return res.status(404).json({ error: "Profile not found" });

  const updated = updateProfile(req.params.id ?? "", (p) => ({
    ...p,
    ...req.body,
    userId: p.userId,
    updatedAt: new Date().toISOString(),
  }));
  if (!updated) return res.status(404).json({ error: "Profile not found" });
  res.json(updated);
});

// Add score
profileRouter.post("/:id/scores", (req, res) => {
  const existing = getProfileForUser(req.params.id ?? "", req.userId!);
  if (!existing) return res.status(404).json({ error: "Profile not found" });

  const { bureau, score, scoreModel, recordedAt } = req.body;
  if (!bureau || score === undefined) {
    return res.status(400).json({ error: "bureau and score are required" });
  }

  const entry: ScoreEntry = {
    id: `score-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    profileId: req.params.id ?? "",
    bureau,
    score: Number(score),
    scoreModel: scoreModel ?? "fico8",
    recordedAt: recordedAt ?? new Date().toISOString(),
    source: "manual",
  };

  const updated = updateProfile(req.params.id ?? "", (p) => ({
    ...p,
    scores: [...p.scores, entry],
    updatedAt: new Date().toISOString(),
  }));

  if (!updated) return res.status(404).json({ error: "Profile not found" });
  res.status(201).json(entry);
});

// Set goal
profileRouter.post("/:id/goal", (req, res) => {
  const existing = getProfileForUser(req.params.id ?? "", req.userId!);
  if (!existing) return res.status(404).json({ error: "Profile not found" });

  const { targetScore, targetDate, purpose, description } = req.body;
  const updated = updateProfile(req.params.id ?? "", (p) => ({
    ...p,
    goal: purpose ?? p.goal,
    scoreGoal: { targetScore: Number(targetScore), targetDate: targetDate ?? null, purpose: purpose ?? "better_score", description: description ?? "" },
    updatedAt: new Date().toISOString(),
  }));
  if (!updated) return res.status(404).json({ error: "Profile not found" });
  res.json(updated.scoreGoal);
});

// Add account manually
profileRouter.post("/:id/accounts", (req, res) => {
  const existing = getProfileForUser(req.params.id ?? "", req.userId!);
  if (!existing) return res.status(404).json({ error: "Profile not found" });

  const body = req.body;
  const account: CreditAccount = {
    id: `acct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    creditorName: body.creditorName ?? "",
    accountNumber: body.accountNumber ?? "",
    accountType: body.accountType ?? "revolving",
    accountStatus: body.accountStatus ?? "open",
    balance: body.balance != null ? Number(body.balance) : null,
    creditLimit: body.creditLimit != null ? Number(body.creditLimit) : null,
    highBalance: body.highBalance != null ? Number(body.highBalance) : null,
    monthlyPayment: body.monthlyPayment != null ? Number(body.monthlyPayment) : null,
    dateOpened: body.dateOpened ?? null,
    dateClosed: body.dateClosed ?? null,
    dateReported: body.dateReported ?? null,
    dateOfLastActivity: body.dateOfLastActivity ?? null,
    dateOfFirstDelinquency: body.dateOfFirstDelinquency ?? null,
    paymentHistory: body.paymentHistory ?? [],
    remarks: body.remarks ?? [],
    originalCreditor: body.originalCreditor ?? null,
    collectionAgency: body.collectionAgency ?? null,
    metro2SegmentId: null,
    bureaus: body.bureaus ?? [body.bureau ?? "equifax"],
    bureauData: {},
    snapshotDate: body.snapshotDate != null ? Number(body.snapshotDate) : null,
    paymentDueDate: body.paymentDueDate != null ? Number(body.paymentDueDate) : null,
    lastTransactionDate: body.lastTransactionDate ?? null,
    isAuthorizedUser: body.isAuthorizedUser ?? false,
    primaryHolderName: body.primaryHolderName ?? null,
    isNegative: body.isNegative ?? false,
    negativeReason: body.negativeReason ?? null,
    isMedical: body.isMedical ?? false,
    isDisputed: false,
    source: "manual",
  };

  const updated = updateProfile(req.params.id ?? "", (p) => ({
    ...p,
    accounts: [...p.accounts, account],
    updatedAt: new Date().toISOString(),
  }));

  if (!updated) return res.status(404).json({ error: "Profile not found" });
  res.status(201).json(account);
});

// Delete account
profileRouter.delete("/:id/accounts/:accountId", (req, res) => {
  const existing = getProfileForUser(req.params.id ?? "", req.userId!);
  if (!existing) return res.status(404).json({ error: "Profile not found" });

  const updated = updateProfile(req.params.id ?? "", (p) => ({
    ...p,
    accounts: p.accounts.filter(a => a.id !== req.params.accountId),
    updatedAt: new Date().toISOString(),
  }));
  if (!updated) return res.status(404).json({ error: "Profile not found" });
  res.json({ deleted: req.params.accountId });
});

// Add address
profileRouter.post("/:id/addresses", (req, res) => {
  const existing = getProfileForUser(req.params.id ?? "", req.userId!);
  if (!existing) return res.status(404).json({ error: "Profile not found" });

  const { street, city, state, zip, isCurrent } = req.body;
  const updated = updateProfile(req.params.id ?? "", (p) => ({
    ...p,
    addresses: [...p.addresses, { street, city, state, zip, isCurrent: isCurrent ?? true, verifiedAt: null }],
    updatedAt: new Date().toISOString(),
  }));
  if (!updated) return res.status(404).json({ error: "Profile not found" });
  res.status(201).json(updated.addresses);
});
