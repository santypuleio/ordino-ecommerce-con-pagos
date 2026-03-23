/**
 * Prueba POST a la Web App de Apps Script (mismo payload que el webhook).
 * Uso: desde carpeta backend → node scripts/test-apps-script.mjs
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const url = (process.env.GOOGLE_APPS_SCRIPT_URL || "").trim();
const secret = (process.env.GOOGLE_APPS_SCRIPT_SECRET || "").trim();

if (!url || !secret) {
  console.error("Falta GOOGLE_APPS_SCRIPT_URL o GOOGLE_APPS_SCRIPT_SECRET en backend/.env");
  process.exit(1);
}

// Mismo shape que metadata.cart en checkout.js → webhook → syncSaleViaAppsScript.
// Usá un título que exista en la columna Producto de tu hoja STOCK (ej. Iphone 10).
const testTitle = (process.env.APPS_SCRIPT_TEST_TITLE || "Iphone 10").trim();
const testId = (process.env.APPS_SCRIPT_TEST_ID || "iphone-10").trim();

const payload = {
  secret,
  paymentId: `test-cli-${Date.now()}`,
  items: [
    {
      id: testId,
      title: testTitle,
      quantity: 1,
      unit_price: 300000,
    },
  ],
};

console.log("Ítem de prueba:", testTitle, "| Podés cambiar con APPS_SCRIPT_TEST_TITLE en .env\n");

console.log("POST", url.slice(0, 60) + "...");
const res = await fetch(url, {
  method: "POST",
  redirect: "follow",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});

const text = await res.text();
console.log("HTTP", res.status);
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}

if (!res.ok) process.exit(1);
const data = JSON.parse(text);
if (data.ok === false) {
  if (!data.scriptBuild) {
    console.error(
      "\n>>> La respuesta no trae scriptBuild: la Web App en Google sigue con código VIEJO.",
      "En Apps Script: Implementar → Administrar implementaciones → lápiz → Nueva versión → Implementar.\n",
    );
  } else if (data.phase) {
    console.error("\n>>> Falló la fase:", data.phase, "\n");
  }
  process.exit(1);
}
