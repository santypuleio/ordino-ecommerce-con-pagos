import React, { useEffect, useMemo, useState } from "react";
import { fetchProductsFromSheets } from "../lib/sheets.jsx";
import { Link } from "react-router-dom";
import logo from "../img/logo.png";

const BRAND = {
  name: "Ordino",
  tagline: "Catálogo demo conectado a tu Stock (Google Sheets).",
  subtagline:
    "Mostrá productos, categorías y stock en vivo. El botón Comprar abre WhatsApp con el producto precargado.",
  whatsappNumber: "+5491121826396", // <-- tu número (con código país)
};

function formatARS(n) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$ ${n}`;
  }
}

export default function ShopPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Todas");
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [sortBy, setSortBy] = useState("categoria");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setStatus({ loading: true, error: "" });
        const data = await fetchProductsFromSheets();
        if (!alive) return;
        setItems(data);
        setStatus({ loading: false, error: "" });
      } catch (e) {
        if (!alive) return;
        setStatus({ loading: false, error: e?.message || "Error cargando productos" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((p) => p.categoria || "General"));
    return ["Todas", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = items
      .filter((p) => (cat === "Todas" ? true : p.categoria === cat))
      .filter((p) => (onlyInStock ? p.stock > 0 : true))
      .filter((p) => {
        if (!q) return true;
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q)
        );
      });

    // Aplicar ordenamiento según la selección
    if (sortBy === "precio-mayor") {
      result.sort((a, b) => b.precio - a.precio);
    } else if (sortBy === "precio-menor") {
      result.sort((a, b) => a.precio - b.precio);
    } else if (sortBy === "vendido") {
      result.sort((a, b) => b.stock - a.stock);
    } else {
      // categoria (default)
      result.sort((a, b) => {
        const catCompare = a.categoria.localeCompare(b.categoria);
        if (catCompare !== 0) return catCompare;
        
        const sa = a.stock > 0 ? 0 : 1;
        const sb = b.stock > 0 ? 0 : 1;
        if (sa !== sb) return sa - sb;
        
        return a.nombre.localeCompare(b.nombre);
      });
    }

    return result;
  }, [items, cat, onlyInStock, query, sortBy]);

  return (
    <div>
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Ordino" className="h-20 w-20 object-contain" />
            <div>
              <div className="text-lg font-bold text-zinc-100">{BRAND.name}</div>
              <div className="text-xs text-zinc-500">Catálogo en vivo</div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-xs">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30"
            />
          </div>

          <a
            href={`https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(
              "Hola! Quiero ver una demo del ecommerce conectado al stock."
            )}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 whitespace-nowrap"
          >
            Pedir demo
          </a>
        </div>
      </header>

      {/* Controls - Mobile search */}
      <section className="md:hidden mx-auto max-w-6xl px-4 py-3 border-b border-zinc-800">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-400/60"
        />
      </section>

      {/* Filters */}
      <section className="mx-auto max-w-6xl px-4 py-4 border-b border-zinc-800">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-zinc-200 bg-zinc-900/30 rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              En stock
            </label>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <label className="text-xs uppercase tracking-wide text-zinc-500">Categoría:</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/60"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-zinc-950">
                  {c}
                </option>
              ))}
            </select>

            <label className="text-xs uppercase tracking-wide text-zinc-500">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/60"
            >
              <option value="categoria" className="bg-zinc-950">Categoría</option>
              <option value="precio-mayor" className="bg-zinc-950">Mayor precio</option>
              <option value="precio-menor" className="bg-zinc-950">Menor precio</option>
              <option value="vendido" className="bg-zinc-950">Más vendido</option>
            </select>
            <span className="text-xs text-zinc-500">{filtered.length} producto(s)</span>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        {status.loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-zinc-300">
            Cargando productos desde Sheets…
          </div>
        ) : status.error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-zinc-200">
            <div className="font-semibold">No se pudo cargar el catálogo</div>
            <div className="mt-2 text-sm text-zinc-300">{status.error}</div>
            <div className="mt-3 text-xs text-zinc-400">
              Tip: revisá que la hoja esté “Publicada en la web” como CSV, y que el link sea el de output=csv.
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/producto/${encodeURIComponent(p.id)}`}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden hover:bg-zinc-900/40 transition"
              >
                <div className="aspect-[16/10] bg-zinc-950/40 border-b border-zinc-800 overflow-hidden">
                  {p.imagen ? (
                    <img
                      src={p.imagen}
                      alt={p.nombre}
                      className="h-full w-full object-contain object-center group-hover:scale-[1.02] transition"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-zinc-600 text-sm">
                      Sin imagen
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm text-zinc-400">{p.categoria}</div>
                      <div className="mt-1 font-semibold leading-tight truncate">
                        {p.nombre}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-emerald-300">
                      {formatARS(p.precio)}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={[
                        "text-xs rounded-full px-2 py-1 border",
                        p.stock > 0
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : "border-zinc-700 bg-zinc-950/30 text-zinc-400",
                      ].join(" ")}
                    >
                      {p.stock > 0 ? `Stock: ${p.stock}` : "Sin stock"}
                    </span>

                    <span className="text-xs text-zinc-500">
                      Ver detalle →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}