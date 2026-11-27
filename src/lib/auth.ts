import crypto from "node:crypto";
import { cookies } from "next/headers";
import { staffAccountExists } from "./db";
import type { StaffRole } from "./types";

export const STAFF_COOKIE_NAME = "kafe_staff_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const DEMO_PINS: Record<StaffRole, string> = {
  CASHIER: process.env.CASHIER_PIN || "1234",
  MANAGER: process.env.MANAGER_PIN || "9999",
};

const rateBuckets = new Map<string, number[]>();

export function resetRateLimitsForTests(): void {
  rateBuckets.clear();
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSec: number } {
  const cutoff = now - windowMs;
  const timestamps = (rateBuckets.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateBuckets.set(key, timestamps);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  rateBuckets.set(key, timestamps);
  if (rateBuckets.size > 500) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.every((t) => t <= cutoff)) rateBuckets.delete(k);
    }
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "local";
  return req.headers.get("x-real-ip")?.trim() || "local";
}

export function verifySameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  if (!host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function getSecret(): string {
  return process.env.STAFF_SESSION_SECRET || "kafe-v1-local-demo-secret";
}

export function verifyPin(role: StaffRole, pin: string): boolean {
  const expected = DEMO_PINS[role];
  if (pin.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
}

export function createStaffToken(role: StaffRole, staffId?: string, now = Date.now()): string {
  const payload = JSON.stringify({ role, staffId, iat: now });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyStaffToken(token: string | undefined, now = Date.now()): StaffRole | null {
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      role?: StaffRole;
      staffId?: string;
      iat?: number;
    };
    if (data.role !== "CASHIER" && data.role !== "MANAGER") return null;
    if (typeof data.iat !== "number" || now - data.iat > SESSION_TTL_MS || data.iat > now + 60_000) {
      return null;
    }
    if (data.staffId && !staffAccountExists(data.staffId, data.role)) {
      return null;
    }
    return data.role;
  } catch {
    return null;
  }
}

export async function getStaffSessionRole(): Promise<StaffRole | null> {
  const store = await cookies();
  return verifyStaffToken(store.get(STAFF_COOKIE_NAME)?.value);
}

export function hasRoleAccess(sessionRole: StaffRole | null, required: StaffRole): boolean {
  if (!sessionRole) return false;
  return sessionRole === required;
}
