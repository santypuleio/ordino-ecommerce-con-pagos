import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z
  .object({
    NODE_ENV: z.string().optional().default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),
    BACKEND_BASE_URL: z.string().min(1).default("http://localhost:4000"),

    MP_PUBLIC_KEY: z.string().min(1),
    MP_ACCESS_TOKEN: z.string().min(1),
    MP_WEBHOOK_URL: z.string().optional(),

    /** Sheets API (opcional si usás Apps Script) */
    GOOGLE_SHEETS_SPREADSHEET_ID: z.string().optional().default(""),
    GOOGLE_SHEETS_RANGE: z.string().optional().default(""),
    GOOGLE_EGRESOS_SHEET_NAME: z.string().min(1).default("Egresos"),

    GOOGLE_SERVICE_ACCOUNT_JSON_PATH: z.string().optional(),
    GOOGLE_CLIENT_EMAIL: z.string().optional(),
    GOOGLE_PRIVATE_KEY: z.string().optional(),

    /** Apps Script Web App (opcional; alternativa sin Google Cloud) */
    GOOGLE_APPS_SCRIPT_URL: z.string().optional().default(""),
    GOOGLE_APPS_SCRIPT_SECRET: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    const scriptUrl = (data.GOOGLE_APPS_SCRIPT_URL || "").trim();
    const scriptSecret = (data.GOOGLE_APPS_SCRIPT_SECRET || "").trim();
    const useScript = Boolean(scriptUrl && scriptSecret);

    const hasAuth =
      Boolean((data.GOOGLE_SERVICE_ACCOUNT_JSON_PATH || "").trim()) ||
      (Boolean((data.GOOGLE_CLIENT_EMAIL || "").trim()) &&
        Boolean((data.GOOGLE_PRIVATE_KEY || "").trim()));

    const hasSheet =
      Boolean((data.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim()) &&
      Boolean((data.GOOGLE_SHEETS_RANGE || "").trim());

    if (useScript) return;
    if (hasAuth && hasSheet) return;

    ctx.addIssue({
      code: "custom",
      message:
        "Sheets: configurá GOOGLE_APPS_SCRIPT_URL + GOOGLE_APPS_SCRIPT_SECRET, o bien GOOGLE_SHEETS_SPREADSHEET_ID + GOOGLE_SHEETS_RANGE + credenciales de service account (JSON o EMAIL+PRIVATE_KEY).",
      path: ["GOOGLE_APPS_SCRIPT_URL"],
    });
  });

export const env = EnvSchema.parse(process.env);

export function assertGoogleAuthConfigured() {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH) return;
  if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) return;
  throw new Error(
    "Falta configurar Google Auth: setear GOOGLE_SERVICE_ACCOUNT_JSON_PATH o GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY"
  );
}

