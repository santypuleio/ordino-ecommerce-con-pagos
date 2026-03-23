import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../cart/CartContext.jsx";
import { createPreference } from "../lib/api.js";

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

export default function CartPage() {
  const cart = useCart();
  const [status, setStatus] = useState({ loading: false, error: "" });

  const mpItems = useMemo(() => {
    return cart.items.map((i) => ({
      id: String(i.id),
      title: String(i.title),
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      picture_url: i.picture_url || undefined,
    }));
  }, [cart.items]);

  async function onCheckout() {
    try {
      setStatus({ loading: true, error: "" });
      const data = await createPreference({ items: mpItems });
      const initPoint = data?.init_point;
      if (!initPoint) throw new Error("Respuesta inválida del backend (sin init_point)");
      window.location.href = initPoint;
    } catch (e) {
      setStatus({ loading: false, error: e?.message || "No se pudo iniciar el pago" });
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Carrito</h1>
        <Link to="/" className="text-sm text-zinc-300 hover:text-zinc-100">
          ← Seguir comprando
        </Link>
      </div>

      {cart.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-zinc-300">
          Tu carrito está vacío.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="divide-y divide-zinc-800">
              {cart.items.map((i) => (
                <div key={i.id} className="p-4 flex gap-4">
                  <div className="h-16 w-16 rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden grid place-items-center">
                    {i.picture_url ? (
                      <img src={i.picture_url} alt={i.title} className="h-full w-full object-contain" />
                    ) : (
                      <div className="text-xs text-zinc-600">Sin img</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{i.title}</div>
                    <div className="mt-1 text-sm text-zinc-400">{formatARS(i.unit_price)}</div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="text-sm text-zinc-300 flex items-center gap-2">
                        Cant.
                        <input
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={(e) => cart.setQty(i.id, e.target.value)}
                          className="w-24 rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-100 outline-none"
                        />
                      </label>

                      <button
                        onClick={() => cart.removeItem(i.id)}
                        className="text-sm rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-zinc-200 hover:bg-zinc-900/50"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-sm text-zinc-500">Subtotal</div>
                    <div className="mt-1 font-semibold">
                      {formatARS((Number(i.unit_price) || 0) * (Number(i.quantity) || 0))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 h-fit">
            <div className="text-sm text-zinc-400">Total</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">
              {formatARS(cart.totalAmount)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">{cart.totalQty} item(s)</div>

            {status.error ? (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-zinc-200">
                {status.error}
              </div>
            ) : null}

            <button
              disabled={status.loading}
              onClick={onCheckout}
              className={[
                "mt-5 w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold",
                status.loading
                  ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
              ].join(" ")}
            >
              {status.loading ? "Redirigiendo…" : "Pagar con Mercado Pago"}
            </button>

            <button
              onClick={() => cart.clear()}
              className="mt-3 w-full inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-900/50"
            >
              Vaciar carrito
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

