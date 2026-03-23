import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  BACKEND_BASE_URL: z.string().min(1).default("http://localhost:4000"),

  MP_PUBLIC_KEY: z.string().min(1),
  MP_ACCESS_TOKEN: z.string().min(1),
  MP_WEBHOOK_URL: z.string().optional(),

  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_SHEETS_RANGE: z.string().min(1),

  GOOGLE_SERVICE_ACCOUNT_JSON_PATH: z.string().optional(),
  GOOGLE_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);

export function assertGoogleAuthConfigured() {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH) return;
  if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) return;
  throw new Error(
    "Falta configurar Google Auth: setear GOOGLE_SERVICE_ACCOUNT_JSON_PATH o GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY"
  );
}

