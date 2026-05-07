import { Router } from "express";
import Handlebars from "handlebars";
import { getFormLibrary, getFormById, getFormsByCategory } from "../engines/documents/form-library.js";
import { clients } from "../lib/store.js";
import type { RenderedDocument } from "../types/index.js";

export const formsRouter = Router();

// ─── List all forms ─────────────────────────────────────────────────────────

formsRouter.get("/", (_req, res) => {
  const forms = getFormLibrary();
  const summary = forms.map((f) => ({
    formId: f.formId,
    name: f.name,
    category: f.category,
    description: f.description,
    legalCodes: f.legalCodes,
    attackType: f.attackType,
    requiredFields: f.requiredFields,
  }));
  return res.json({ forms: summary, total: summary.length });
});

// ─── Get forms by category ──────────────────────────────────────────────────

formsRouter.get("/category/:category", (req, res) => {
  const forms = getFormsByCategory(req.params.category);
  return res.json({ forms, total: forms.length });
});

// ─── Get single form ────────────────────────────────────────────────────────

formsRouter.get("/:formId", (req, res) => {
  const form = getFormById(req.params.formId);
  if (!form) return res.status(404).json({ error: "Form not found" });
  return res.json({ form });
});

// ─── Render form with variables ─────────────────────────────────────────────

formsRouter.post("/:formId/render", (req, res) => {
  const form = getFormById(req.params.formId);
  if (!form) return res.status(404).json({ error: "Form not found" });

  const variables = req.body as Record<string, string>;

  // Auto-inject client data if clientId is provided
  if (variables.clientId) {
    const client = clients.get(variables.clientId);
    if (client) {
      if (!variables.client_name) variables.client_name = client.name;
      if (!variables.client_address) {
        const parts = [client.street, client.city, `${client.county}, ${client.state}`, client.zip].filter(Boolean);
        variables.client_address = parts.join("\n");
      }
    }
  }

  // Auto-inject date
  if (!variables.date) {
    variables.date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  }

  // Check for missing required fields
  const missingFields: string[] = [];
  for (const field of form.requiredFields) {
    if (!variables[field]) missingFields.push(field);
  }

  // Render template
  const template = Handlebars.compile(form.body, { noEscape: true });
  const content = template(variables);

  const rendered: RenderedDocument = {
    formId: form.formId,
    formName: form.name,
    content,
    missingFields,
    complete: missingFields.length === 0,
  };

  return res.json(rendered);
});
