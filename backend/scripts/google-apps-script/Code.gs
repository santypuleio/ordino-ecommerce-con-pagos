/**
 * Ordino — Web App para stock + Egresos (pegar en Apps Script del spreadsheet)
 *
 * 1) Editá SECRET, SHEET_STOCK, SHEET_EGRESOS, STOCK_RANGE
 * 2) Implementar → Aplicación web → Ejecutar como: Yo → Cualquier usuario
 * 3) Copiá la URL /exec al backend: GOOGLE_APPS_SCRIPT_URL
 */

/** Misma clave que GOOGLE_APPS_SCRIPT_SECRET en backend/.env (no subas tu clave real a Git). */
var SECRET = "CAMBIAR_POR_TU_SECRETO_LARGO";
var SHEET_STOCK = "STOCK";
var SHEET_EGRESOS = "Egresos";
/** Rango que incluye cabeceras en la hoja de stock */
var STOCK_RANGE = "A1:Z1000";

/** Si ves este id en la respuesta JSON, la Web App ya usa este archivo (nueva implementación). */
var SCRIPT_BUILD = "egresos-a1-phase-20250308-stock-colfix";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ ok: false, scriptBuild: SCRIPT_BUILD, error: "empty body" });
    }
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return jsonOut({ ok: false, scriptBuild: SCRIPT_BUILD, error: "unauthorized" });
    }

    var items = body.items || [];
    var paymentId = String(body.paymentId || "");

    if (!items.length) {
      return jsonOut({
        ok: true,
        scriptBuild: SCRIPT_BUILD,
        warning: "no_items",
        paymentId: paymentId,
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shStock = ss.getSheetByName(SHEET_STOCK);
    var shEg = ss.getSheetByName(SHEET_EGRESOS);
    if (!shStock) {
      return jsonOut({
        ok: false,
        scriptBuild: SCRIPT_BUILD,
        error: "missing stock sheet: " + SHEET_STOCK,
      });
    }
    if (!shEg) {
      return jsonOut({
        ok: false,
        scriptBuild: SCRIPT_BUILD,
        error: "missing egresos sheet: " + SHEET_EGRESOS,
      });
    }

    var egresosRows;
    try {
      egresosRows = appendEgresos_(shEg, items);
    } catch (egErr) {
      return jsonOut({
        ok: false,
        scriptBuild: SCRIPT_BUILD,
        phase: "egresos",
        error: String(egErr),
      });
    }

    var stockUpdates;
    try {
      stockUpdates = decrementStock_(shStock, items);
    } catch (stErr) {
      return jsonOut({
        ok: false,
        scriptBuild: SCRIPT_BUILD,
        phase: "stock",
        egresosRows: egresosRows,
        error: String(stErr),
      });
    }

    return jsonOut({
      ok: true,
      scriptBuild: SCRIPT_BUILD,
      paymentId: paymentId,
      egresosRows: egresosRows,
      stockUpdates: stockUpdates,
    });
  } catch (err) {
    return jsonOut({ ok: false, scriptBuild: SCRIPT_BUILD, error: String(err) });
  }
}

/**
 * El navegador abre la URL con GET. Sin doGet, Google muestra "No se encontró doGet".
 * El backend y Mercado Pago usan POST (doPost); esto solo confirma que la Web App vive.
 */
function doGet() {
  return jsonOut({
    ok: true,
    scriptBuild: SCRIPT_BUILD,
    message:
      "Ordino Web App activa. Las ventas se registran con POST JSON (secret, paymentId, items).",
  });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function normalizeKey(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseNumberLoose(v) {
  var raw = String(v != null ? v : "")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!raw) return 0;
  var hasComma = raw.indexOf(",") >= 0;
  var hasDot = raw.indexOf(".") >= 0;
  var normalized = raw;
  if (hasComma && hasDot) {
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    normalized = raw.replace(",", ".");
  }
  var n = parseFloat(normalized);
  return isFinite(n) ? n : 0;
}

function columnToLetter(colIdx0) {
  var n = colIdx0 + 1;
  var s = "";
  while (n > 0) {
    var r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function findHeaderIndex(headers, candidates) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[normalizeKey(headers[i])] = i;
  }
  for (var c = 0; c < candidates.length; c++) {
    var idx = map[normalizeKey(candidates[c])];
    if (idx !== undefined) return idx;
  }
  return -1;
}

function appendEgresos_(sh, items) {
  var now = new Date();
  var d = now.getDate();
  var m = now.getMonth() + 1;
  var y = now.getFullYear();
  var fecha = d + "/" + m + "/" + y;
  var rows = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var producto = String(it.title || "").trim();
    var cantidad = Math.max(0, Math.floor(Number(it.quantity || 0)));
    var unit = Number(it.unit_price || 0);
    if (!isFinite(unit)) unit = 0;
    var subtotal = unit * cantidad;
    if (!producto || cantidad <= 0) continue;
    rows.push([fecha, producto, cantidad, "", "", subtotal, subtotal]);
  }
  // appendRow() a veces falla igual si el libro tiene miles de filas “tocadas” en otras columnas.
  // Buscamos la última fila con algo en A:G (solo egresos) y escribimos ahí con setValues exacto.
  if (rows.length) {
    var maxScan = 5000;
    var block = sh.getRange(1, 1, maxScan, 7).getValues();
    var last = 0;
    for (var ri = 0; ri < block.length; ri++) {
      var row = block[ri];
      var has = false;
      for (var cj = 0; cj < row.length; cj++) {
        if (row[cj] !== "" && row[cj] != null) {
          has = true;
          break;
        }
      }
      if (has) last = ri + 1;
    }
    var startRow = last + 1;
    var endRow = startRow + rows.length - 1;
    // Siempre notación A1: evita confusiones con getRange(fila,col,?,?) en Apps Script.
    var a1 = "A" + startRow + ":G" + endRow;
    sh.getRange(a1).setValues(rows);
  }
  return rows.length;
}

function decrementStock_(sh, items) {
  var range = sh.getRange(STOCK_RANGE);
  var values = range.getValues();
  if (!values.length) return [];

  var headers = values[0];
  var idCol = findHeaderIndex(headers, ["id", "ID", "Id"]);
  var stockCol = findHeaderIndex(headers, ["stock", "Stock"]);
  var nameCol = findHeaderIndex(headers, ["producto", "Producto", "nombre", "Nombre"]);
  if (stockCol < 0) {
    throw new Error("No hay columna Stock en " + SHEET_STOCK);
  }
  if (idCol < 0 && nameCol < 0) {
    throw new Error("No hay columna id ni Producto en " + SHEET_STOCK);
  }

  var rowById = {};
  var rowByName = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    // Fila real en la hoja (no asumir que el rango empieza en fila 1).
    var sheetRow = range.getRow() + r;
    if (idCol >= 0 && row[idCol] != null && String(row[idCol]).trim() !== "") {
      rowById[normalizeKey(row[idCol])] = { sheetRow: sheetRow, row: row };
    }
    if (nameCol >= 0 && row[nameCol] != null && String(row[nameCol]).trim() !== "") {
      rowByName[normalizeKey(row[nameCol])] = { sheetRow: sheetRow, row: row };
    }
  }

  // Columna absoluta de Stock (stockCol es índice 0.. dentro del rango leído).
  var absStockCol = range.getColumn() + stockCol;
  var colLetter = columnToLetter(absStockCol - 1);
  // Quitar validación en toda la columna Stock del rango: a veces clear en 1 celda no alcanza (tabla / regla en bloque).
  var dataStartRow = range.getRow() + 1;
  var dataRowCount = range.getNumRows() - 1;
  if (dataRowCount > 0) {
    var stockDataRange = sh.getRange(dataStartRow, absStockCol, dataRowCount, 1);
    stockDataRange.clearDataValidations();
    stockDataRange.setDataValidation(null);
    SpreadsheetApp.flush();
  }

  var applied = [];

  for (var j = 0; j < items.length; j++) {
    var it = items[j];
    var id = normalizeKey(it.id);
    var title = normalizeKey(it.title);
    var qty = Math.floor(Number(it.quantity || 0));
    if (!qty || qty <= 0) continue;

    var found =
      (idCol >= 0 && id ? rowById[id] : null) ||
      (nameCol >= 0 && title ? rowByName[title] : null);
    if (!found) continue;

    var current = parseNumberLoose(found.row[stockCol]);
    var next = Math.max(0, Math.floor(current - qty));
    var cell = sh.getRange(colLetter + found.sheetRow);
    cell.clearDataValidations();
    cell.setDataValidation(null);
    cell.setValue(next);
    found.row[stockCol] = next;
    if (idCol >= 0 && id) rowById[id] = found;
    if (nameCol >= 0 && title) rowByName[title] = found;

    applied.push({
      id: it.id,
      title: it.title,
      quantity: qty,
      from: current,
      to: next,
      row: found.sheetRow,
    });
  }

  return applied;
}
