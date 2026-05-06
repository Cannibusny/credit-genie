import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Persisted client identity records.
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  state: text("state").notNull(),
  county: text("county").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Cross-bureau audit results. Nested arrays/objects are stored as JSON text.
export const audits = sqliteTable("audits", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  createdAt: text("created_at").notNull(),
  reports: text("reports").notNull(),
  matchedAccounts: text("matched_accounts").notNull(),
  discrepancies: text("discrepancies").notNull(),
  totalViolations: integer("total_violations").notNull(),
  estimatedDamages: real("estimated_damages").notNull(),
  summary: text("summary").notNull(),
});

// One row per dispute letter. Bureau / status are stored as plain text enums.
export const disputes = sqliteTable("disputes", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  auditId: text("audit_id").notNull(),
  discrepancyId: text("discrepancy_id").notNull(),
  bureau: text("bureau").notNull(),
  status: text("status").notNull(),
  letterContent: text("letter_content").notNull(),
  sentAt: text("sent_at"),
  responseDeadline: text("response_deadline"),
  responseReceivedAt: text("response_received_at"),
  responseContent: text("response_content"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Generated documents (dispute letters, court filings) keyed by audit.
export const generatedDocuments = sqliteTable("generated_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  auditId: text("audit_id").notNull(),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  generatedAt: text("generated_at").notNull(),
});

// Aggregated court filing packages. Disputes/jurisdiction/courtForms are JSON text.
export const litigationPackages = sqliteTable("litigation_packages", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  disputeIds: text("dispute_ids").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  courtForms: text("court_forms").notNull(),
  estimatedDamages: real("estimated_damages").notNull(),
  createdAt: text("created_at").notNull(),
});
