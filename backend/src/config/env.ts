import "dotenv/config";
import { z } from "zod";

const boolFromString = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "1")
  .default("false");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL jest wymagane"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET powinien mieć min. 16 znaków"),

  APP_PORT: z.coerce.number().default(4000),
  APP_HTTPS_PORT: z.coerce.number().default(4443),
  ENABLE_HTTPS: boolFromString,
  SSL_CERT_PATH: z.string().optional().default(""),
  SSL_KEY_PATH: z.string().optional().default(""),
  TRUST_PROXY: boolFromString,

  PUBLIC_BASE_URL: z.string().default("http://localhost:4000"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_LOCKOUT_STAGES_MINUTES: z
    .string()
    .default("15,60,1440")
    .transform((v) =>
      v
        .split(",")
        .map((n) => Number(n.trim()))
        .filter((n) => !Number.isNaN(n) && n > 0)
    ),
  LOGIN_RATE_LIMIT_PER_IP: z.coerce.number().default(20),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),

  // Czysto informacyjne — appka je tylko wyświetla (patrz /api/health i
  // stopka w Ustawieniach), nie wpływają na działanie niczego innego.
  APP_AUTHOR: z.string().default("wachcio"),
  APP_VERSION: z.string().default("1.0.0"),
  APP_RELEASE_DATE: z.string().default("2026-09-10"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Błędna konfiguracja środowiska (.env):");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

if (env.ENABLE_HTTPS && (!env.SSL_CERT_PATH || !env.SSL_KEY_PATH)) {
  console.error(
    "ENABLE_HTTPS=true wymaga ustawienia SSL_CERT_PATH i SSL_KEY_PATH w .env."
  );
  process.exit(1);
}

if (env.LOGIN_LOCKOUT_STAGES_MINUTES.length === 0) {
  console.error("LOGIN_LOCKOUT_STAGES_MINUTES musi zawierać co najmniej jedną wartość.");
  process.exit(1);
}
