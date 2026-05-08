// Authentication middleware — verifies Supabase JWT or falls back to stub auth
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { getAdminClient, isSupabaseConfigured } from "../lib/supabase.js";
import { log } from "../lib/logger.js";
import { stubs } from "../lib/config.js";

// Augment Express Request with auth fields
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

// HMAC key for signing stub tokens (deterministic so all serverless instances agree)
const STUB_SIGNING_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "credit-genie-stub-key-2026";

/** Create an HMAC-signed token encoding user identity (no server-side state needed). */
export function createStubToken(userId: string, email: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, email })).toString("base64url");
  const sig = crypto.createHmac("sha256", STUB_SIGNING_KEY).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify and decode an HMAC-signed stub token. Returns null if invalid. */
function verifyStubToken(token: string): { userId: string; email: string } | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", STUB_SIGNING_KEY).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId: string; email: string };
  } catch { return null; }
}

// Legacy in-memory sessions kept for backward compat (logout, etc.)
const stubSessions = new Map<string, { userId: string; email: string }>();

export function createStubSession(token: string, userId: string, email: string): void {
  stubSessions.set(token, { userId, email });
}

export function removeStubSession(token: string): void {
  stubSessions.delete(token);
}

/**
 * Auth middleware: extracts Bearer token from Authorization header,
 * verifies it with Supabase Auth, and attaches userId + userEmail to the request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Provide Bearer token in Authorization header." });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  if (stubs.supabase || !isSupabaseConfigured()) {
    // Stub mode: first try HMAC-signed token, then fall back to legacy session lookup
    const verified = verifyStubToken(token);
    if (verified) {
      req.userId = verified.userId;
      req.userEmail = verified.email;
      next();
      return;
    }
    const session = stubSessions.get(token);
    if (!session) {
      res.status(401).json({ error: "Invalid or expired session token" });
      return;
    }
    req.userId = session.userId;
    req.userEmail = session.email;
    next();
    return;
  }

  // Supabase mode: verify JWT
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).json({ error: "Auth service unavailable" });
    return;
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      log.warn({ error: error?.message }, "Auth token verification failed");
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = data.user.id;
    req.userEmail = data.user.email ?? "";
    next();
  } catch (err) {
    log.error({ err }, "Auth middleware error");
    res.status(500).json({ error: "Authentication service error" });
  }
}
