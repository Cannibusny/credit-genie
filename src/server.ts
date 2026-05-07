import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, stubs } from "./lib/config.js";
import { log } from "./lib/logger.js";
import { auditRouter } from "./routes/audit.js";
import { litigationRouter } from "./routes/litigation.js";
import { builderRouter } from "./routes/builder.js";
import { documentsRouter } from "./routes/documents.js";
import { clientRouter } from "./routes/clients.js";
import { simulatorRouter } from "./routes/simulator.js";
import { formsRouter } from "./routes/forms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, "..", "public")));

// API routes
app.use("/api/audit", auditRouter);
app.use("/api/litigation", litigationRouter);
app.use("/api/builder", builderRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/clients", clientRouter);
app.use("/api/simulator", simulatorRouter);
app.use("/api/forms", formsRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "credit-genie",
    version: "0.2.0",
    stubs,
    uptime: process.uptime(),
  });
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(config.PORT, () => {
  log.info({ port: config.PORT, stubs }, `Credit Genie v0.2.0 running on :${config.PORT}`);
});
