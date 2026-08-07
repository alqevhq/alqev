import { createHash } from "crypto";

export type RateLimitKey = {
  uid?: string;
  ip?: string;
};

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

export function getMinuteKey(date = new Date()): string {
  return date
    .toISOString()
    .slice(0, 16)
    .replace(/[-:T]/g, "");
}

export function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function secondsUntilNextMinute(
  date = new Date(),
): number {
  return Math.max(
    1,
    60 - date.getUTCSeconds(),
  );
}

export function secondsUntilTomorrow(
  date = new Date(),
): number {
  const tomorrow = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
    ),
  );

  return Math.max(
    1,
    Math.ceil(
      (tomorrow.getTime() - date.getTime()) /
        1000,
    ),
  );
}

export function getExpiryDate(
  hours = 2,
): Date {
  return new Date(
    Date.now() + hours * 60 * 60 * 1000,
  );
}

export function safeCounter(
  value: unknown,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function remaining(
  current: number,
  limit: number,
): number {
  return Math.max(limit - current, 0);
}

export function isUnlimited(
  limit: number,
): boolean {
  return !Number.isFinite(limit);
}