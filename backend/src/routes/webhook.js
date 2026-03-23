import express from "express";
import { z } from "zod";
import { mpPayment } from "../config/mercadopago.js";
import { logger } from "../utils/logger.js";
import { decrementStockByCart } from "../services/sheets/stock.js";
import { appendEgresosByCart } from "../services/sheets/egresos.js";
import {
  isAppsScriptMode,
  syncSaleViaAppsScript,
} from "../services/sheets/appsScriptSync.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const processedPayments = new Set();

// Solo validamos query; z.record(z.any()) rompe en Zod v4 con headers de Express.
const ProcessApprovedSchema = z.object({
  query: z.object({
    payment_id: z.coerce.string().min(1),
  }),
  body: z.unknown().optional(),
  params: z.unknown().optional(),
  headers: z.unknown().optional(),
});

function extractPaymentId(req) {
  // Mercado Pago puede mandar:
  // - ?topic=payment&id=123 (id es payment_id)
  // - ?type=payment&data.id=123
  // - merchant_order: ?topic=merchant_order&id=... (id NO es payment; ignorar)
  const q = req.query || {};
  const b = req.body || {};
  const topic = String(q.topic || "").toLowerCase();

  if (topic === "merchant_order" || topic === "merchant-order") {
    return null;
  }

  const typeQ = String(q.type || "").toLowerCase();
  if (typeQ === "payment" && q["data.id"] != null && String(q["data.id"]).trim() !== "") {
    return String(q["data.id"]).trim();
  }

  if (topic === "payment" && q.id != null && String(q.id).trim() !== "") {
    return String(q.id).trim();
  }

  const fromQuery =
    q["data.id"] ||
    q["data_id"] ||
    (q.data && q.data.id) ||
    undefined;

  const fromBody =
    b?.data?.id || b?.id || (typeof b === "string" ? undefined : undefined);

  const id = fromQuery ?? fromBody;
  if (!id) return null;
  return String(id).trim();
}

function extractCartFromPayment(payment) {
  const metaCart = payment?.metadata?.cart;
  if (Array.isArray(metaCart) && metaCart.length) {
    return metaCart.map((i) => ({
      id: String(i.id ?? "").trim(),
      title: String(i.title ?? "").trim(),
      quantity: Number(i.quantity ?? 0),
      unit_price: Number(i.unit_price ?? 0),
    }));
  }

  const additional = payment?.additional_info?.items;
  if (Array.isArray(additional) && additional.length) {
    return additional.map((i) => ({
      id: String(i.id ?? "").trim(),
      title: String(i.title ?? "").trim(),
      quantity: Number(i.quantity ?? 0),
      unit_price: Number(i.unit_price ?? 0),
    }));
  }

  return [];
}

async function processApprovedPayment({ paymentId, requestId }) {
  if (processedPayments.has(paymentId)) {
    logger.info("Pago ya procesado, se ignora reproceso", { requestId, paymentId });
    return { ok: true, status: "already_processed" };
  }

  const payment = await mpPayment.get({ id: paymentId });
  const status = String(payment?.status || "").toLowerCase();

  logger.info("Estado de pago consultado", {
    requestId,
    paymentId,
    status,
  });

  if (status !== "approved") {
    return { ok: true, status };
  }

  const cartItems = extractCartFromPayment(payment);
  if (!cartItems.length) {
    logger.warn("Pago aprobado pero no se pudo reconstruir carrito", {
      requestId,
      paymentId,
    });
    processedPayments.add(paymentId);
    return { ok: true, status, warning: "no_cart" };
  }

  if (isAppsScriptMode()) {
    await syncSaleViaAppsScript({
      cartItems,
      paymentId,
      requestId,
    });
  } else {
    await decrementStockByCart({
      cartItems,
      requestId,
      paymentId,
    });

    await appendEgresosByCart({
      cartItems,
      requestId,
      paymentId,
    });
  }

  processedPayments.add(paymentId);
  return { ok: true, status };
}

router.post(
  "/webhook/mercadopago",
  express.json({ limit: "200kb" }),
  async (req, res, next) => {
    try {
      const paymentId = extractPaymentId(req);
      if (!paymentId) {
        logger.info("Webhook ignorado (no es notificación de payment o sin id)", {
          requestId: req.id,
          topic: req.query?.topic,
          type: req.query?.type,
        });
        return res.status(200).json({ ok: true });
      }

      if (processedPayments.has(paymentId)) {
        logger.info("Webhook duplicado ignorado (payment ya procesado)", {
          requestId: req.id,
          paymentId,
        });
        return res.status(200).json({ ok: true });
      }

      logger.info("Webhook Mercado Pago recibido", { requestId: req.id, paymentId });
      const result = await processApprovedPayment({ paymentId, requestId: req.id });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/payments/process-approved",
  validate(ProcessApprovedSchema),
  async (req, res, next) => {
    try {
      const paymentId = String(req.validated.query.payment_id ?? "").trim();
      const result = await processApprovedPayment({ paymentId, requestId: req.id });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

