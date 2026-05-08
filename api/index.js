// Vercel Serverless Function — exports the Express app
// Auto-seeds founding users on cold start so they're always available
import crypto from "node:crypto";

// Import from pre-compiled dist/ (built by npm run build)
const { app } = await import("../dist/app.js");
const { stubUsers } = await import("../dist/routes/auth.js");

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Deterministic user ID — same email always gets the same ID across all instances
function deterministicId(email) {
  return "user-" + crypto.createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}

// Auto-seed the 3 founding users on module init (handles cold starts)
const foundingUsers = [
  { email: "sjw136@msn.com", firstName: "Sheridan", lastName: "Williams", password: "CreditGenie2026!" },
  { email: "audreybonanno@aol.com", firstName: "Audrey", lastName: "Bonanno-Williams", password: "CreditGenie2026!" },
  { email: "audrey.salgado@yahoo.com", firstName: "Audrey", lastName: "Salgado", password: "CreditGenie2026!" },
];

for (const u of foundingUsers) {
  if (!stubUsers.has(u.email.toLowerCase())) {
    stubUsers.set(u.email.toLowerCase(), {
      id: deterministicId(u.email),
      email: u.email.toLowerCase(),
      password: hashPassword(u.password),
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: new Date().toISOString(),
    });
  }
}

export default app;
