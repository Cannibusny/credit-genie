import { Router } from "express";
import {
  DISPUTE_TEMPLATES,
  getTemplateByFormId,
  renderTemplate,
  bureauInfo,
} from "../engines/documents/index.js";
import type { RenderContext } from "../engines/documents/index.js";
import type { Bureau } from "../types/index.js";

export const documentsRouter = Router();

const VALID_BUREAUS = new Set<string>(["equifax", "experian", "transunion"]);

function applyBureau(context: RenderContext, bureau: string | undefined): RenderContext {
  if (!bureau || !VALID_BUREAUS.has(bureau)) return context;
  const info = bureauInfo[bureau as Bureau];
  return {
    ...context,
    bureau_name: info.name,
    bureau_address: info.address,
  };
}

// ─── GET /api/documents/templates ────────────────────────────────────────────

documentsRouter.get("/templates", (_req, res) => {
  res.json({
    templates: DISPUTE_TEMPLATES.map((t) => ({
      formId: t.formId,
      name: t.name,
      category: t.category,
      description: t.description,
      requiredFields: t.requiredFields,
    })),
  });
});

// ─── GET /api/documents/templates/:formId ────────────────────────────────────

documentsRouter.get("/templates/:formId", (req, res) => {
  const formId = req.params.formId;
  if (!formId) {
    res.status(400).json({ error: "formId is required" });
    return;
  }
  const template = getTemplateByFormId(formId);
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

// ─── POST /api/documents/render ──────────────────────────────────────────────
//
// Body: { formId: string, context: RenderContext, bureau?: Bureau }

documentsRouter.post("/render", (req, res) => {
  const body = req.body as {
    formId?: string;
    context?: RenderContext;
    bureau?: string;
  };

  if (!body.formId) {
    res.status(400).json({ error: "formId is required" });
    return;
  }

  const template = getTemplateByFormId(body.formId);
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const context = applyBureau(body.context ?? {}, body.bureau);
  const result = renderTemplate(template, context);
  res.json(result);
});

// ─── POST /api/documents/download ────────────────────────────────────────────

documentsRouter.post("/download", (req, res) => {
  const body = req.body as {
    formId?: string;
    context?: RenderContext;
    bureau?: string;
  };

  if (!body.formId) {
    res.status(400).json({ error: "formId is required" });
    return;
  }

  const template = getTemplateByFormId(body.formId);
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const context = applyBureau(body.context ?? {}, body.bureau);
  const result = renderTemplate(template, context);

  if (!result.complete) {
    res.status(400).json({
      error: "Cannot download — missing required fields",
      missingFields: result.missingFields,
    });
    return;
  }

  const safeFormId = template.formId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeFormId}-${Date.now()}.txt`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(result.content);
});
