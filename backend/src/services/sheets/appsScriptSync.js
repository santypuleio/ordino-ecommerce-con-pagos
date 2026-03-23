import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

/**
 * Sincroniza venta (stock + Egresos) vía Google Apps Script Web App.
 * No usa Google Cloud / service account en el backend.
 */
export async function syncSaleViaAppsScript({ cartItems, paymentId, requestId }) {
  const url = (env.GOOGLE_APPS_SCRIPT_URL || "").trim();
  const secret = (env.GOOGLE_APPS_SCRIPT_SECRET || "").trim();
  if (!url || !secret) {
    throw new Error("Falta GOOGLE_APPS_SCRIPT_URL o GOOGLE_APPS_SCRIPT_SECRET");
  }

  const payload = {
    secret,
    paymentId: String(paymentId || ""),
    items: (cartItems || []).map((i) => ({
      id: String(i.id ?? "").trim(),
      title: String(i.title ?? "").trim(),
      quantity: Number(i.quantity ?? 0),
      unit_price: Number(i.unit_price ?? 0),
    })),
  };

  const res = await fetch(url, {
    method: "POST",
    redirect: "follow",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    logger.error("Apps Script respondió error HTTP", {
      requestId,
      paymentId,
      status: res.status,
      body: data,
    });
    throw new Error(data?.error || `Apps Script HTTP ${res.status}`);
  }

  if (data && data.ok === false) {
    logger.error("Apps Script devolvió ok:false", {
      requestId,
      paymentId,
      body: data,
    });
    throw new Error(data.error || "Apps Script rechazó la operación");
  }

  logger.info("Venta sincronizada vía Apps Script", {
    requestId,
    paymentId,
    stockUpdates: data?.stockUpdates,
    egresosRows: data?.egresosRows,
  });

  return data;
}

export function isAppsScriptMode() {
  const url = (env.GOOGLE_APPS_SCRIPT_URL || "").trim();
  const secret = (env.GOOGLE_APPS_SCRIPT_SECRET || "").trim();
  return Boolean(url && secret);
}
