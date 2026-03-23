import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { processApprovedPayment } from "../lib/api.js";

const MAP = {
  success: {
    title: "Pago aprobado",
    detail: "¡Listo! Mercado Pago aprobó el pago. En unos segundos se actualizará el stock.",
    cls: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  },
  pending: {
    title: "Pago pendiente",
    detail: "El pago quedó pendiente. Te avisaremos cuando se acredite.",
    cls: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  },
  failure: {
    title: "Pago rechazado",
    detail: "No se pudo completar el pago. Podés intentar nuevamente.",
    cls: "border-red-500/30 bg-red-500/10 text-red-200",
  },
};

export default function CheckoutStatusPage({ status }) {
  const loc = useLocation();
  const cfg = MAP[status] || MAP.pending;
  const [sync, setSync] = useState({ loading: false, done: false, error: "" });

  const paymentId = useMemo(() => {
    const params = new URLSearchParams(loc.search);
    return (
      params.get("payment_id") ||
      params.get("collection_id") ||
      params.get("paymentId") ||
      ""
    ).trim();
  }, [loc.search]);

  useEffect(() => {
    if (status !== "success") return;
    if (!paymentId) return;
    if (sync.done || sync.loading) return;

    let alive = true;
    (async () => {
      try {
        setSync({ loading: true, done: false, error: "" });
        await processApprovedPayment(paymentId);
        if (!alive) return;
        setSync({ loading: false, done: true, error: "" });
      } catch (e) {
        if (!alive) return;
        setSync({
          loading: false,
          done: false,
          error: e?.message || "No se pudo confirmar stock/egreso",
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [status, paymentId, sync.done, sync.loading]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className={["rounded-2xl border p-6", cfg.cls].join(" ")}>
        <div className="text-xl font-semibold">{cfg.title}</div>
        <div className="mt-2 text-sm opacity-90">{cfg.detail}</div>
        <div className="mt-4 text-xs opacity-80 break-all">
          Ref: {loc.search || "(sin referencia)"}
        </div>
        {status === "success" ? (
          <div className="mt-3 text-xs opacity-90">
            {sync.loading
              ? "Sincronizando stock y egresos..."
              : sync.done
                ? "Stock y egresos sincronizados."
                : sync.error
                  ? `No se pudo sincronizar automaticamente: ${sync.error}`
                  : "Esperando referencia de pago para sincronizar."}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
        >
          Volver al catálogo
        </Link>
        <Link
          to="/carrito"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900/50"
        >
          Ir al carrito
        </Link>
      </div>
    </div>
  );
}

