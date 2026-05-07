import { Router } from "express";
import { randomUUID } from "node:crypto";
import {
  clients, scoreEntries, scoreGoals, manualAccounts, alerts, workflows,
  getOrCreateClient, addScoreEntry, addManualAccount, addAlert,
} from "../lib/store.js";
import type { Client, ScoreEntry, ScoreGoal, ManualAccount, ClientWorkflow, Alert } from "../types/index.js";

export const clientRouter = Router();

// ─── List all clients ───────────────────────────────────────────────────────

clientRouter.get("/", (_req, res) => {
  const list = Array.from(clients.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  res.json({ clients: list });
});

// ─── Create client ──────────────────────────────────────────────────────────

clientRouter.post("/", (req, res) => {
  const { name, email, phone, ssn, dob, street, city, state, county, zip } = req.body as Partial<Client>;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const id = randomUUID();
  const client = getOrCreateClient(id, { name, email: email ?? "", phone, ssn, dob, street, city, state: state ?? "", county: county ?? "", zip });
  client.name = name;
  if (email) client.email = email;
  if (phone) client.phone = phone;
  if (ssn) client.ssn = ssn;
  if (dob) client.dob = dob;
  if (street) client.street = street;
  if (city) client.city = city;
  if (state) client.state = state;
  if (county) client.county = county;
  if (zip) client.zip = zip;
  client.updatedAt = new Date().toISOString();
  clients.set(id, client);

  // Initialize workflow
  const workflow: ClientWorkflow = {
    clientId: id,
    currentStage: "intake",
    intake: { completedAt: null, violationsFound: 0 },
    strike: { completedAt: null, lettersSent: 0, round: 0 },
    followUp: { completedAt: null, responsesReceived: 0, movSent: 0 },
    rebuild: { completedAt: null, tradelinesAdded: 0, scoreGain: 0 },
  };
  workflows.set(id, workflow);

  return res.json({ client, workflow });
});

// ─── Get single client ──────────────────────────────────────────────────────

clientRouter.get("/:id", (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  const workflow = workflows.get(req.params.id) ?? null;
  const scores = scoreEntries.get(req.params.id) ?? [];
  const goal = scoreGoals.get(req.params.id) ?? null;
  const accounts = manualAccounts.get(req.params.id) ?? [];
  const clientAlerts = alerts.get(req.params.id) ?? [];
  return res.json({ client, workflow, scores, goal, accounts, alerts: clientAlerts });
});

// ─── Update client ──────────────────────────────────────────────────────────

clientRouter.put("/:id", (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  const fields = req.body as Partial<Client>;
  if (fields.name) client.name = fields.name;
  if (fields.email) client.email = fields.email;
  if (fields.phone !== undefined) client.phone = fields.phone;
  if (fields.ssn !== undefined) client.ssn = fields.ssn;
  if (fields.dob !== undefined) client.dob = fields.dob;
  if (fields.street !== undefined) client.street = fields.street;
  if (fields.city !== undefined) client.city = fields.city;
  if (fields.state) client.state = fields.state;
  if (fields.county) client.county = fields.county;
  if (fields.zip !== undefined) client.zip = fields.zip;
  client.updatedAt = new Date().toISOString();
  clients.set(req.params.id, client);
  return res.json({ client });
});

// ─── Add note to client ─────────────────────────────────────────────────────

clientRouter.post("/:id/notes", (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  const { content } = req.body as { content: string };
  if (!content) return res.status(400).json({ error: "Content is required" });
  const note = { id: randomUUID(), content, createdAt: new Date().toISOString() };
  client.notes.push(note);
  client.updatedAt = new Date().toISOString();
  return res.json({ note });
});

// ─── Score Tracking ─────────────────────────────────────────────────────────

clientRouter.post("/:id/scores", (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  const { bureau, score, scoreModel, recordedAt } = req.body as Partial<ScoreEntry>;
  if (!bureau || !score) return res.status(400).json({ error: "Bureau and score are required" });

  const entry: ScoreEntry = {
    id: randomUUID(),
    clientId: req.params.id,
    bureau,
    score,
    scoreModel: scoreModel ?? "fico8",
    recordedAt: recordedAt ?? new Date().toISOString(),
    source: "manual",
  };
  addScoreEntry(entry);
  return res.json({ score: entry });
});

clientRouter.get("/:id/scores", (req, res) => {
  const scores = scoreEntries.get(req.params.id) ?? [];
  const goal = scoreGoals.get(req.params.id) ?? null;
  return res.json({ scores, goal });
});

// ─── Score Goal ─────────────────────────────────────────────────────────────

clientRouter.post("/:id/goal", (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  const { targetScore, targetDate, purpose } = req.body as Partial<ScoreGoal>;
  if (!targetScore) return res.status(400).json({ error: "Target score is required" });

  const goal: ScoreGoal = {
    clientId: req.params.id,
    targetScore,
    targetDate: targetDate ?? null,
    purpose: purpose ?? "",
  };
  scoreGoals.set(req.params.id, goal);
  return res.json({ goal });
});

// ─── Manual Account Entry ───────────────────────────────────────────────────

clientRouter.post("/:id/accounts", (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  const body = req.body as Partial<ManualAccount>;
  if (!body.creditorName) return res.status(400).json({ error: "Creditor name is required" });

  const account: ManualAccount = {
    id: randomUUID(),
    clientId: req.params.id,
    creditorName: body.creditorName,
    accountNumber: body.accountNumber ?? "",
    accountType: body.accountType ?? "unknown",
    bureau: body.bureau ?? "equifax",
    accountStatus: body.accountStatus ?? "unknown",
    balance: body.balance ?? null,
    creditLimit: body.creditLimit ?? null,
    dateOpened: body.dateOpened ?? null,
    dateClosed: body.dateClosed ?? null,
    dateOfFirstDelinquency: body.dateOfFirstDelinquency ?? null,
    monthlyPayment: body.monthlyPayment ?? null,
    paymentStatus: body.paymentStatus ?? "current",
    isNegative: body.isNegative ?? false,
    negativeReason: body.negativeReason ?? null,
    notes: body.notes ?? "",
    createdAt: new Date().toISOString(),
  };
  addManualAccount(account);
  return res.json({ account });
});

clientRouter.get("/:id/accounts", (req, res) => {
  const accounts = manualAccounts.get(req.params.id) ?? [];
  return res.json({ accounts });
});

// ─── Alerts ─────────────────────────────────────────────────────────────────

clientRouter.get("/:id/alerts", (req, res) => {
  const clientAlerts = alerts.get(req.params.id) ?? [];
  return res.json({ alerts: clientAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
});

clientRouter.put("/:id/alerts/:alertId/read", (req, res) => {
  const clientAlerts = alerts.get(req.params.id) ?? [];
  const alert = clientAlerts.find((a) => a.id === req.params.alertId);
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  alert.read = true;
  return res.json({ alert });
});

// ─── Workflow ───────────────────────────────────────────────────────────────

clientRouter.get("/:id/workflow", (req, res) => {
  const workflow = workflows.get(req.params.id) ?? null;
  return res.json({ workflow });
});
