import IORedis from "ioredis";

// BullMQ requires maxRetriesPerRequest: null
export const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (err) => console.error("Redis error:", err.message));
redis.on("connect", () => console.log("✅ Redis connected"));

export const getRedis = () => redis;
