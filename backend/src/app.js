import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import checkoutRoutes from "./routes/checkout.js";
import webhookRoutes from "./routes/webhook.js";

/** Orígenes permitidos: FRONTEND_ORIGIN puede ser varios separados por coma (local + Netlify). */
function parseAllowedOrigins() {
  return String(env.FRONTEND_ORIGIN || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  const allowedOrigins = parseAllowedOrigins();

  app.use(requestId);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const normalized = String(origin).replace(/\/+$/, "");
        if (allowedOrigins.includes(normalized)) return callback(null, true);
        logger.warn("CORS: origen no permitido", {
          origin: normalized,
          allowedOrigins,
        });
        return callback(null, false);
      },
      credentials: false,
    })
  );
  app.use(helmet());

  app.use(
    morgan("combined", {
      stream: {
        write: (msg) => logger.info(msg.trim()),
      },
    })
  );

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  app.use(checkoutRoutes);
  app.use(webhookRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

