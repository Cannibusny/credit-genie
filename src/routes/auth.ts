// Auth routes — login, signup, logout, session check
import { Router } from "express";
import crypto from "node:crypto";
import { getAdminClient, getPublicClient, isSupabaseConfigured } from "../lib/supabase.js";
import { createStubSession, removeStubSession, requireAuth } from "../middleware/auth.js";
import { stubs } from "../lib/config.js";
import { log } from "../lib/logger.js";

export const authRouter = Router();

// ─── Stub user store (when Supabase is not configured) ──────────────────────
interface StubUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

const stubUsers = new Map<string, StubUser>(); // keyed by email

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// ─── POST /api/auth/signup ──────────────────────────────────────────────────
authRouter.post("/signup", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (stubs.supabase || !isSupabaseConfigured()) {
    // Stub mode
    if (stubUsers.has(email.toLowerCase())) {
      return res.status(409).json({ error: "User already exists" });
    }
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    stubUsers.set(email.toLowerCase(), {
      id,
      email: email.toLowerCase(),
      password: hashPassword(password),
      firstName: firstName ?? "",
      lastName: lastName ?? "",
      createdAt: new Date().toISOString(),
    });
    const token = crypto.randomBytes(32).toString("hex");
    createStubSession(token, id, email.toLowerCase());
    log.info({ email, userId: id }, "Stub user created");
    return res.status(201).json({
      user: { id, email: email.toLowerCase(), firstName, lastName },
      accessToken: token,
    });
  }

  // Supabase mode
  const admin = getAdminClient();
  if (!admin) return res.status(500).json({ error: "Auth service unavailable" });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm for founding users
    user_metadata: { firstName: firstName ?? "", lastName: lastName ?? "" },
  });

  if (error) {
    log.warn({ error: error.message, email }, "Signup failed");
    return res.status(400).json({ error: error.message });
  }

  // Sign in immediately to get a session token
  const pub = getPublicClient();
  if (!pub) return res.status(500).json({ error: "Auth service unavailable" });

  const { data: signIn, error: signInError } = await pub.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) {
    return res.status(201).json({
      user: { id: data.user.id, email: data.user.email },
      accessToken: null,
      message: "User created but auto-login failed. Please log in manually.",
    });
  }

  res.status(201).json({
    user: { id: data.user.id, email: data.user.email, firstName, lastName },
    accessToken: signIn.session.access_token,
    refreshToken: signIn.session.refresh_token,
  });
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (stubs.supabase || !isSupabaseConfigured()) {
    // Stub mode
    const user = stubUsers.get(email.toLowerCase());
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    createStubSession(token, user.id, user.email);
    log.info({ email: user.email, userId: user.id }, "Stub login");
    return res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      accessToken: token,
    });
  }

  // Supabase mode
  const pub = getPublicClient();
  if (!pub) return res.status(500).json({ error: "Auth service unavailable" });

  const { data, error } = await pub.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    log.warn({ error: error?.message, email }, "Login failed");
    return res.status(401).json({ error: error?.message ?? "Invalid email or password" });
  }

  // Fetch user metadata for name
  const meta = data.user.user_metadata ?? {};

  res.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      firstName: meta.firstName ?? "",
      lastName: meta.lastName ?? "",
    },
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────
authRouter.post("/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    removeStubSession(token); // no-op if Supabase mode
  }
  res.json({ success: true });
});

// ─── GET /api/auth/session ──────────────────────────────────────────────────
authRouter.get("/session", requireAuth as any, (req, res) => {
  res.json({
    authenticated: true,
    userId: req.userId,
    email: req.userEmail,
  });
});

// ─── POST /api/auth/seed — Create founding users ────────────────────────────
authRouter.post("/seed", async (_req, res) => {
  const foundingUsers = [
    { email: "sjw136@msn.com", firstName: "Sheridan", lastName: "Williams", password: "CreditGenie2026!" },
    { email: "audreybonanno@aol.com", firstName: "Audrey", lastName: "Bonanno-Williams", password: "CreditGenie2026!" },
    { email: "audrey.salgado@yahoo.com", firstName: "Audrey", lastName: "Salgado", password: "CreditGenie2026!" },
  ];

  const results: Array<{ email: string; status: string; userId?: string; error?: string }> = [];

  if (stubs.supabase || !isSupabaseConfigured()) {
    // Stub mode
    for (const u of foundingUsers) {
      if (stubUsers.has(u.email.toLowerCase())) {
        const existing = stubUsers.get(u.email.toLowerCase())!;
        results.push({ email: u.email, status: "already_exists", userId: existing.id });
        continue;
      }
      const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      stubUsers.set(u.email.toLowerCase(), {
        id,
        email: u.email.toLowerCase(),
        password: hashPassword(u.password),
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: new Date().toISOString(),
      });
      results.push({ email: u.email, status: "created", userId: id });
    }
    return res.json({ mode: "stub", users: results });
  }

  // Supabase mode
  const admin = getAdminClient();
  if (!admin) return res.status(500).json({ error: "Auth service unavailable" });

  for (const u of foundingUsers) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { firstName: u.firstName, lastName: u.lastName },
    });

    if (error) {
      // Check if user already exists
      if (error.message.includes("already") || error.message.includes("duplicate")) {
        results.push({ email: u.email, status: "already_exists", error: error.message });
      } else {
        results.push({ email: u.email, status: "error", error: error.message });
      }
    } else {
      results.push({ email: u.email, status: "created", userId: data.user.id });
    }
  }

  res.json({ mode: "supabase", users: results });
});

// Export stub users map for store access
export { stubUsers };
