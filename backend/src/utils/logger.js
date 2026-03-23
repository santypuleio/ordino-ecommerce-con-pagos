const LEVELS = new Set(["debug", "info", "warn", "error"]);

function pickLevel() {
  const raw = (process.env.LOG_LEVEL || "").toLowerCase().trim();
  return LEVELS.has(raw) ? raw : "info";
}

const level = pickLevel();
const order = { debug: 10, info: 20, warn: 30, error: 40 };

function shouldLog(lvl) {
  return order[lvl] >= order[level];
}

function serialize(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function base(lvl, msg, meta) {
  if (!shouldLog(lvl)) return;
  const payload = {
    ts: new Date().toISOString(),
    level: lvl,
    msg,
    ...(meta && typeof meta === "object" ? meta : meta ? { meta } : null),
  };
  // eslint-disable-next-line no-console
  console[lvl === "debug" ? "log" : lvl](serialize(payload));
}

export const logger = {
  debug: (msg, meta) => base("debug", msg, meta),
  info: (msg, meta) => base("info", msg, meta),
  warn: (msg, meta) => base("warn", msg, meta),
  error: (msg, meta) => base("error", msg, meta),
};

