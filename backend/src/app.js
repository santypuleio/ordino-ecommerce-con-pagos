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

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestId);
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
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

