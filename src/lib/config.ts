import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  APP_URL: z.string().url().default("http://localhost:3001"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),

  DATABASE_PATH: z.string().default("./credit-genie.db"),

  PLAID_CLIENT_ID: z.string().optional(),
  PLAID_SECRET: z.string().optional(),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),

  MAX_REPORT_SIZE_MB: z.coerce.number().default(25),
  DISPUTE_RESPONSE_DEADLINE_DAYS: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

export const config = envSchema.parse(process.env);

const stubKeys = ["anthropic", "plaid"] as const;
type StubKey = (typeof stubKeys)[number];

export const stubs: Record<StubKey, boolean> = {
  anthropic: !config.ANTHROPIC_API_KEY,
  plaid: !(config.PLAID_CLIENT_ID && config.PLAID_SECRET),
};
