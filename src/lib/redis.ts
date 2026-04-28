import IORedis from "ioredis";
import { logger } from "./logger";

const log = logger.child({ module: "redis" });

// BullMQ requires maxRetriesPerRequest: null
export const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (err) => log.error({ err: err.message }, "Redis connection error"));
redis.on("connect", () => log.info("Redis connected"));

export const getRedis = () => redis;
