import { logger } from "../utils/logger.js";

export function notFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  logger.error("Unhandled error", {
    requestId: req?.id,
    path: req?.path,
    method: req?.method,
    error: {
      name: err?.name,
      message: err?.message,
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
    },
  });

  const status = Number(err?.statusCode || err?.status || 500);
  res.status(Number.isFinite(status) ? status : 500).json({
    error: "Internal server error",
    requestId: req?.id,
  });
}

