import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, stubs } from "./lib/config.js";
import { log } from "./lib/logger.js";
import { profileRouter } from "./routes/profiles.js";
import { modulesRouter } from "./routes/modules.js";
import { importRouter } from "./routes/import.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// API routes
app.use("/api/profiles", profileRouter);
app.use("/api/modules", modulesRouter);
app.use("/api/import", importRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "credit-genie",
    version: "3.0.0",
    stubs,
    uptime: process.uptime(),
  });
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(config.PORT, () => {
  log.info({ port: config.PORT, stubs }, `Credit Genie v3.0.0 running on :${config.PORT}`);
});
