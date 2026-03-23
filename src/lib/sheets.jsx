import Papa from "papaparse";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgCARZiE47P_VhqSUuHl3tspA7H-VrW2K8IJmAnIndz1uft01v1a3DhkdpNEGILujydPMgEDdQDEI9/pub?gid=2138097766&single=true&output=csv";

function parseNumberLoose(v) {
  // Acepta: "300,000.00" "300000" "$ 300.000,00" etc
  const raw = String(v ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!raw) return 0;

  // Si tiene coma y punto, asumimos coma miles y punto decimal (o viceversa)
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  let normalized = raw;

  if (hasComma && hasDot) {
    // Si el último separador es coma => decimal coma (AR: 1.234.567,89)
    if (raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      // decimal punto (US: 300,000.00)
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // puede ser decimal coma (AR: 1.234,56)
    normalized = raw.replace(",", ".");
  } else {
    // solo punto o nada: ok
    normalized = raw;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

export async function fetchProductsFromSheets() {
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  const csv = await res.text();

  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  // Normalizar nombres de columnas para búsqueda flexible
  const findColumn = (obj, searchTerm) => {
    const normalized = searchTerm.toLowerCase().trim();
    const key = Object.keys(obj).find(
      (k) => k.toLowerCase().trim() === normalized
    );
    return key ? obj[key] : "";
  };

  // Debug: mostrar columnas disponibles
  if (parsed.data && parsed.data.length > 0) {
    const firstRow = parsed.data[0];
    console.log("Columnas detectadas:", Object.keys(firstRow));
    console.log("Primera fila raw:", firstRow);
  }

  const data = (parsed.data || [])
    .map((r, idx) => {
      const rawId = (findColumn(r, "id") || findColumn(r, "ID") || findColumn(r, "Id"))?.trim();
      const nombre = (findColumn(r, "Producto") || findColumn(r, "Nombre") || findColumn(r, "name"))?.trim();
      if (!nombre) return null;

      const stock = parseNumberLoose(findColumn(r, "Stock") || findColumn(r, "stock"));
      const precioRaw =
        findColumn(r, "Precio Minorista") ||
        findColumn(r, "Precio") ||
        findColumn(r, "precio") ||
        findColumn(r, "price");
      const precio = parseNumberLoose(precioRaw);
      const categoria = (
        findColumn(r, "Categoria") ||
        findColumn(r, "Categoría") ||
        findColumn(r, "category") ||
        "Sin categoría"
      ).trim();
      const imagenRaw = findColumn(r, "ImagenURL") || findColumn(r, "imagen_url") || findColumn(r, "Imagen");
      const imagen = imagenRaw?.trim();
      const descripcion = (
        findColumn(r, "Descripcion") ||
        findColumn(r, "Descripción") ||
        findColumn(r, "description") ||
        ""
      )?.trim();

      return {
        id: rawId
          ? rawId
          : `${nombre}-${idx}`.replace(/\s+/g, "-").toLowerCase(),
        nombre,
        stock,
        precio,
        categoria,
        imagen,
        descripcion,
      };
    })
    .filter(Boolean);

  return data;
}