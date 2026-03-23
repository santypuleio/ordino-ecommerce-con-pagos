import crypto from "node:crypto";

export function requestId(req, res, next) {
  const id = crypto.randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
}

