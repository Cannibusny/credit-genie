import Handlebars from "handlebars";
import { format } from "date-fns";
import type {
  Bureau,
  DisputeTemplate,
  RenderedDocument,
} from "../../types/index.js";

// ─── Bureau Addresses ────────────────────────────────────────────────────────
//
// Mirrors the table in `src/engines/sniper/dispute-generator.ts` so this
// module remains independent and self-contained. Keep them in sync if either
// is updated.

export const bureauInfo: Record<Bureau, { name: string; address: string }> = {
  equifax: {
    name: "Equifax Information Services LLC",
    address: "P.O. Box 740256, Atlanta, GA 30374-0256",
  },
  experian: {
    name: "Experian National Consumer Assistance Center",
    address: "P.O. Box 4500, Allen, TX 75013",
  },
  transunion: {
    name: "TransUnion LLC Consumer Dispute Center",
    address: "P.O. Box 2000, Chester, PA 19016",
  },
};

export interface RenderContext {
  client_full_name?: string;
  client_ssn?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_zip?: string;
  client_email?: string;
  client_phone?: string;
  creditor_name?: string;
  account_number?: string;
  bureau_name?: string;
  bureau_address?: string;
  current_date?: string;
  // Form-specific fields
  collection_amount?: string;
  original_creditor?: string;
  police_report_number?: string;
  debt_collector_name?: string;
  debt_collector_address?: string;
  alleged_amount?: string;
  [key: string]: string | undefined;
}

const BRACKET_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/** Extract every distinct `{{bracket}}` name from a template body. */
export function listAllBrackets(template: DisputeTemplate): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of template.body.matchAll(BRACKET_REGEX)) {
    const name = match[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

/**
 * Render a dispute template with the supplied context, auto-filling
 * `current_date`, flagging any required fields that are missing or empty,
 * and substituting `[MISSING: <field>]` for any unresolved bracket so the
 * preview surface can highlight the gap.
 */
export function renderTemplate(
  template: DisputeTemplate,
  context: RenderContext,
): RenderedDocument {
  // Auto-fill current_date if not already provided
  const ctx: RenderContext = {
    ...context,
    current_date:
      context.current_date && context.current_date.trim() !== ""
        ? context.current_date
        : format(new Date(), "MMMM d, yyyy"),
  };

  // Detect missing required fields (empty / whitespace counts as missing)
  const missingFields: string[] = [];
  for (const field of template.requiredFields) {
    const value = ctx[field];
    if (!value || value.trim() === "") {
      missingFields.push(field);
    }
  }

  // Build a render context where every bracket in the template body resolves
  // either to its supplied value or to a clearly marked placeholder.
  const renderContext: Record<string, string> = {};
  for (const fieldName of listAllBrackets(template)) {
    const value = ctx[fieldName];
    if (value && value.trim() !== "") {
      renderContext[fieldName] = value;
    } else {
      renderContext[fieldName] = `[MISSING: ${fieldName}]`;
    }
  }

  const compiled = Handlebars.compile(template.body, { noEscape: true });
  const content = compiled(renderContext);

  return {
    formId: template.formId,
    formName: template.name,
    content,
    missingFields,
    complete: missingFields.length === 0,
  };
}
