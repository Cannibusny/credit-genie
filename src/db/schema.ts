import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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

export const audits = sqliteTable("audits", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  createdAt: text("created_at").notNull(),
  // These are deeply nested objects — store as JSON text columns
  reports: text("reports").notNull(), // JSON: ParsedCreditReport[]
  matchedAccounts: text("matched_accounts").notNull(), // JSON: AccountMatch[]
  discrepancies: text("discrepancies").notNull(), // JSON: Discrepancy[]
  totalViolations: integer("total_violations").notNull(),
  estimatedDamages: real("estimated_damages").notNull(),
  summary: text("summary").notNull(),
});

export const disputes = sqliteTable("disputes", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  auditId: text("audit_id").notNull(),
  discrepancyId: text("discrepancy_id").notNull(),
  bureau: text("bureau").notNull(), // "equifax" | "experian" | "transunion"
  status: text("status").notNull(), // DisputeStatus
  letterContent: text("letter_content").notNull(),
  sentAt: text("sent_at"),
  responseDeadline: text("response_deadline"),
  responseReceivedAt: text("response_received_at"),
  responseContent: text("response_content"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const generatedDocuments = sqliteTable("generated_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  auditId: text("audit_id").notNull(),
  type: text("type").notNull(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  generatedAt: text("generated_at").notNull(),
});

export const litigationPackages = sqliteTable("litigation_packages", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull(),
  disputeIds: text("dispute_ids").notNull(), // JSON: string[] of dispute IDs
  jurisdiction: text("jurisdiction").notNull(), // JSON: JurisdictionInfo
  courtForms: text("court_forms").notNull(), // JSON: GeneratedDocument[]
  estimatedDamages: real("estimated_damages").notNull(),
  createdAt: text("created_at").notNull(),
});
