// ─── Structured Logger (Pino) ────────────────────────────────
// JSON in production, pretty-printed in dev, silent in tests.

import pino from "pino";

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  ...(isTest
    ? { level: "silent" }
    : isProd
      ? { level: "info" }
      : { level: "debug", transport: { target: "pino-pretty", options: { colorize: true } } }),
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

/** Create a child logger bound to a specific context (jobId, requestId, etc.) */
export function childLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
