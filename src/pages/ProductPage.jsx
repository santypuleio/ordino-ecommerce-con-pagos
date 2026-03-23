import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { fetchProductsFromSheets } from "../lib/sheets.jsx";
import { useCart } from "../cart/CartContext.jsx";

const WHATSAPP_NUMBER = "+5491121826396"; // <-- tu número

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

export default function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const cart = useCart();

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [qty, setQty] = useState(1);

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
        setStatus({ loading: false, error: e?.message || "Error cargando producto" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const product = useMemo(() => {
    return items.find((p) => String(p.id) === String(id));
  }, [items, id]);

  const waLink = useMemo(() => {
    if (!product) return "#";
    const msg = [
      "Hola! Quiero comprar / consultar este producto:",
      `• ${product.nombre}`,
      `• Precio: ${formatARS(product.precio)}`,
      `• Stock: ${product.stock}`,
    ]
      .filter(Boolean)
      .join("\n");

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  }, [product]);

  if (status.loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-zinc-300">
        Cargando…
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="font-semibold">Error</div>
          <div className="mt-2 text-sm text-zinc-300">{status.error}</div>
          <button
            onClick={() => nav("/")}
            className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          Producto no encontrado.
          <div className="mt-4">
            <Link
              to="/"
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inStock = product.stock > 0;

  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-sm text-zinc-300 hover:text-zinc-100">
            ← Volver
          </Link>
          <div className="text-xs text-zinc-500">Producto</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30">
            <div className="aspect-[4/3] bg-zinc-950/40">
              {product.imagen ? (
                <img
                  src={product.imagen}
                  alt={product.nombre}
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-zinc-600 text-sm">
                  Sin imagen
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6">
            <div className="text-sm text-zinc-400">{product.categoria}</div>
            <h1 className="mt-2 text-3xl font-semibold">{product.nombre}</h1>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-2xl font-semibold text-emerald-300">
                {formatARS(product.precio)}
              </div>
              <span
                className={[
                  "text-xs rounded-full px-2 py-1 border",
                  inStock
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-zinc-700 bg-zinc-950/30 text-zinc-400",
                ].join(" ")}
              >
                {inStock ? `Stock: ${product.stock}` : "Sin stock"}
              </span>
            </div>

            {product.descripcion ? (
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                {product.descripcion}
              </p>
            ) : (
              <p className="mt-4 text-sm text-zinc-400">
                (Sin descripción)
              </p>
            )}

            <div className="mt-6 grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-zinc-300 flex items-center gap-2">
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value || 1))))}
                    className="w-28 rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none"
                  />
                </label>

                <button
                  disabled={!inStock}
                  onClick={() =>
                    cart.addItem(
                      {
                        id: product.id,
                        title: product.nombre,
                        unit_price: Number(product.precio || 0),
                        picture_url: product.imagen || undefined,
                      },
                      qty
                    )
                  }
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                    inStock
                      ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                      : "bg-zinc-800 text-zinc-300 cursor-not-allowed",
                  ].join(" ")}
                >
                  Agregar al carrito
                </button>

                <Link
                  to="/carrito"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900/50"
                >
                  Ir al carrito
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className={[
                    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                    inStock
                      ? "border border-zinc-800 bg-zinc-950/30 text-zinc-200 hover:bg-zinc-900/50"
                      : "bg-zinc-800 text-zinc-300 cursor-not-allowed pointer-events-none",
                  ].join(" ")}
                >
                  Comprar por WhatsApp
                </a>

                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900/50"
                >
                  Seguir mirando
                </Link>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 text-xs text-zinc-400">
              Mercado Pago Checkout Pro: al pagar, el backend recibe el webhook y descuenta stock en Google Sheets.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}