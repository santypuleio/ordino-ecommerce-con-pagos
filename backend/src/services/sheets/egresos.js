import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { getSheetsClient } from "./googleClient.js";

function formatDateAR(date = new Date()) {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function sanitizeNumber(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return 0;
  return n;
}

export async function appendEgresosByCart({ cartItems, requestId, paymentId }) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { appended: 0 };
  }

  const sheets = await getSheetsClient();
  const fecha = formatDateAR(new Date());

  const rows = cartItems
    .map((item) => {
      const producto = String(item.title || "").trim();
      const cantidad = Math.max(0, Math.floor(sanitizeNumber(item.quantity)));
      const unitPrice = sanitizeNumber(item.unit_price);
      const subtotal = unitPrice * cantidad;

      if (!producto || cantidad <= 0) return null;

      // Estructura esperada en hoja Egresos:
      // A Fecha | B Producto | C Cantidad | D Nombre Cliente | E Vendedor | F Precio | G Pagado
      return [fecha, producto, cantidad, "", "", subtotal, subtotal];
    })
    .filter(Boolean);

  if (!rows.length) {
    logger.warn("No se generaron filas válidas para Egresos", {
      requestId,
      paymentId,
    });
    return { appended: 0 };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `${env.GOOGLE_EGRESOS_SHEET_NAME}!A:G`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  });

  logger.info("Egresos registrados en Google Sheets", {
    requestId,
    paymentId,
    rows: rows.length,
  });

  return { appended: rows.length };
}

