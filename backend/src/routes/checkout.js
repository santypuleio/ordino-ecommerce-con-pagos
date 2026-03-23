import express from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { mpPreference } from "../config/mercadopago.js";
import { logger } from "../utils/logger.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const CreatePreferenceSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          quantity: z.number().int().positive(),
          unit_price: z.number().positive(),
          picture_url: z.string().url().optional(),
          category_id: z.string().optional(),
        })
      )
      .min(1),
  }),
});

function isLikelyPublicHttpsUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return false;
    return true;
  } catch {
    return false;
  }
}

router.post(
  "/create-preference",
  express.json({ limit: "100kb" }),
  validate(CreatePreferenceSchema),
  async (req, res, next) => {
    try {
      const { items } = req.validated.body;

      const notificationUrl =
        (env.MP_WEBHOOK_URL || "").trim() ||
        `${env.BACKEND_BASE_URL.replace(/\/+$/, "")}/webhook/mercadopago`;
      const frontendBase = env.FRONTEND_ORIGIN.replace(/\/+$/, "");

      const successUrl = `${frontendBase}/checkout/success`;
      const pendingUrl = `${frontendBase}/checkout/pending`;
      const failureUrl = `${frontendBase}/checkout/failure`;

      const canUseAutoReturn = isLikelyPublicHttpsUrl(successUrl);

      const preferenceBody = {
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
          picture_url: i.picture_url,
          category_id: i.category_id,
          currency_id: "ARS",
        })),
        metadata: {
          cart: items.map((i) => ({
            id: i.id,
            title: i.title,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        },
        ...(canUseAutoReturn ? { auto_return: "approved" } : {}),
        back_urls: {
          success: successUrl,
          pending: pendingUrl,
          failure: failureUrl,
        },
        notification_url: notificationUrl,
      };

      logger.info("Creando preferencia MP", {
        requestId: req.id,
        itemsCount: items.length,
        notificationUrl: notificationUrl ? true : false,
        autoReturnEnabled: canUseAutoReturn,
        successUrl,
      });

      const mpRes = await mpPreference.create({ body: preferenceBody });

      const initPoint = mpRes?.init_point;
      if (!initPoint) {
        const err = new Error("Mercado Pago no devolvió init_point");
        err.statusCode = 502;
        throw err;
      }

      res.json({
        init_point: initPoint,
        preference_id: mpRes?.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

