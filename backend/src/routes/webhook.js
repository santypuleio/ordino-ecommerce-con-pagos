import express from "express";
import { z } from "zod";
import { mpPayment } from "../config/mercadopago.js";
import { logger } from "../utils/logger.js";
import { decrementStockByCart } from "../services/sheets/stock.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const processedPayments = new Set();

const WebhookSchema = z.object({
  body: z.any().optional(),
  query: z.record(z.any()).optional(),
  headers: z.record(z.any()).optional(),
  params: z.any().optional(),
});

function extractPaymentId(req) {
  // Mercado Pago puede mandar:
  // - query: ?type=payment&data.id=123
  // - body: { type: "payment", data: { id: "123" } }
  const q = req.query || {};
  const b = req.body || {};

  const fromQuery =
    q["data.id"] ||
    q["data_id"] ||
    q["id"] ||
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

router.post(
  "/webhook/mercadopago",
  express.json({ limit: "200kb" }),
  validate(WebhookSchema),
  async (req, res, next) => {
    try {
      const paymentId = extractPaymentId(req);
      if (!paymentId) {
        logger.warn("Webhook recibido sin payment_id", {
          requestId: req.id,
          query: req.query,
          body: req.body,
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

      const payment = await mpPayment.get({ id: paymentId });

      const status = String(payment?.status || "").toLowerCase();
      logger.info("Estado de pago consultado", {
        requestId: req.id,
        paymentId,
        status,
      });

      if (status !== "approved") {
        return res.status(200).json({ ok: true, status });
      }

      const cartItems = extractCartFromPayment(payment);
      if (!cartItems.length) {
        logger.warn("Pago aprobado pero no se pudo reconstruir carrito", {
          requestId: req.id,
          paymentId,
        });
        processedPayments.add(paymentId);
        return res.status(200).json({ ok: true, status, warning: "no_cart" });
      }

      await decrementStockByCart({
        cartItems,
        requestId: req.id,
        paymentId,
      });

      processedPayments.add(paymentId);
      return res.status(200).json({ ok: true, status });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

