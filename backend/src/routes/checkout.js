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

router.post(
  "/create-preference",
  express.json({ limit: "100kb" }),
  validate(CreatePreferenceSchema),
  async (req, res, next) => {
    try {
      const { items } = req.validated.body;

      const notificationUrl = (env.MP_WEBHOOK_URL || "").trim() || undefined;

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
        auto_return: "approved",
        back_urls: {
          success: `https://speedless-roderick-pretelephonic.ngrok-free.dev/checkout/success`,
          pending: `https://speedless-roderick-pretelephonic.ngrok-free.dev/checkout/pending`,
          failure: `https://speedless-roderick-pretelephonic.ngrok-free.dev/checkout/failure`,
        },
        notification_url: notificationUrl,
      };

      logger.info("Creando preferencia MP", {
        requestId: req.id,
        itemsCount: items.length,
        notificationUrl: notificationUrl ? true : false,
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

