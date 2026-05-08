import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stubs } from "./lib/config.js";
import { profileRouter } from "./routes/profiles.js";
import { modulesRouter } from "./routes/modules.js";
import { importRouter } from "./routes/import.js";
import { authRouter } from "./routes/auth.js";
import { log } from "./lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// Auth routes (no auth required on these)
app.use("/api/auth", authRouter);

// Auto-seed founding users on startup (works in both stub and Supabase mode)
setTimeout(async () => {
  try {
    const res = await fetch(`http://localhost:${process.env.PORT || 3001}/api/auth/seed`, { method: "POST" });
    if (res.ok) {
      const data = await res.json() as { mode: string; users?: unknown[] };
      log.info({ mode: data.mode, users: data.users?.length }, "Auto-seeded founding users");
    }
  } catch {
    log.warn("Auto-seed failed (server may not be ready yet)");
  }
}, 1000);

// Protected API routes
app.use("/api/profiles", profileRouter);
app.use("/api/modules", modulesRouter);
app.use("/api/import", importRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "credit-genie",
    version: "3.1.0",
    stubs,
    uptime: process.uptime(),
  });
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

export { app };
