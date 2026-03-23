import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { getSheetsClient } from "./googleClient.js";

function normalizeKey(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseNumberLoose(v) {
  const raw = String(v ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!raw) return 0;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;

  if (hasComma && hasDot) {
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    normalized = raw.replace(",", ".");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function columnToLetter(colIdx0) {
  let n = colIdx0 + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function tryFindHeaderIndex(headers, candidates) {
  const map = new Map(headers.map((h, i) => [normalizeKey(h), i]));
  for (const c of candidates) {
    const idx = map.get(normalizeKey(c));
    if (idx !== undefined) return idx;
  }
  return -1;
}

export async function decrementStockByCart({ cartItems, requestId, paymentId }) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Cart vacío: no hay items para descontar stock");
  }

  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: env.GOOGLE_SHEETS_RANGE,
  });

  const values = res.data.values || [];
  if (values.length < 2) {
    throw new Error("El rango de Google Sheets no tiene datos (faltan filas)");
  }

  const headers = values[0] || [];
  const idCol = tryFindHeaderIndex(headers, ["id", "ID", "Id"]);
  const stockCol = tryFindHeaderIndex(headers, ["stock", "Stock"]);
  const nameCol = tryFindHeaderIndex(headers, ["producto", "Producto", "nombre", "Nombre"]);

  if (stockCol < 0) {
    throw new Error("No se encontró columna 'Stock' en la fila de headers");
  }

  if (idCol < 0 && nameCol < 0) {
    throw new Error("No se encontró columna 'id' ni 'Producto/Nombre' para ubicar filas");
  }

  const rowById = new Map();
  const rowByName = new Map();

  for (let r = 1; r < values.length; r++) {
    const row = values[r] || [];
    const sheetRowNumber = r + 1; // 1-indexed en Sheets

    if (idCol >= 0) {
      const id = normalizeKey(row[idCol]);
      if (id) rowById.set(id, { sheetRowNumber, row });
    }
    if (nameCol >= 0) {
      const name = normalizeKey(row[nameCol]);
      if (name) rowByName.set(name, { sheetRowNumber, row });
    }
  }

  const updates = [];
  const applied = [];

  for (const item of cartItems) {
    const id = normalizeKey(item.id);
    const title = normalizeKey(item.title);
    const qty = Number(item.quantity || 0);

    if (!qty || qty <= 0) continue;

    let found =
      (idCol >= 0 && id ? rowById.get(id) : undefined) ||
      (nameCol >= 0 && title ? rowByName.get(title) : undefined);

    if (!found) {
      logger.warn("No se encontró fila para item (no se descuenta stock)", {
        requestId,
        paymentId,
        item: { id: item.id, title: item.title, quantity: item.quantity },
      });
      continue;
    }

    const current = parseNumberLoose(found.row[stockCol]);
    const next = Math.max(0, Math.floor(current - qty));

    const stockCell = `${columnToLetter(stockCol)}${found.sheetRowNumber}`;
    const sheetName = env.GOOGLE_SHEETS_RANGE.split("!")[0] || "Sheet1";
    updates.push({
      range: `${sheetName}!${stockCell}`,
      values: [[String(next)]],
    });

    applied.push({
      id: item.id,
      title: item.title,
      quantity: qty,
      from: current,
      to: next,
      row: found.sheetRowNumber,
    });
  }

  if (updates.length === 0) {
    logger.warn("No hubo updates de stock para aplicar", { requestId, paymentId });
    return { updated: [], skipped: cartItems.length };
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updates,
    },
  });

  logger.info("Stock actualizado en Google Sheets", {
    requestId,
    paymentId,
    updates: applied,
  });

  return { updated: applied };
}

