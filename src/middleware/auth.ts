// Authentication middleware — verifies Supabase JWT or falls back to stub auth
import type { Request, Response, NextFunction } from "express";
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

// In-memory stub sessions (used when Supabase is not configured)
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
    // Stub mode: look up token in in-memory session store
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
