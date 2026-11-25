import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { StaffRole } from "./types";

export const STAFF_COOKIE_NAME = "kafe_staff_session";

const DEMO_PINS: Record<StaffRole, string> = {
  CASHIER: process.env.CASHIER_PIN || "1234",
  MANAGER: process.env.MANAGER_PIN || "9999",
};

function getSecret(): string {
  return process.env.STAFF_SESSION_SECRET || "kafe-v1-local-demo-secret";
}

export function verifyPin(role: StaffRole, pin: string): boolean {
  const expected = DEMO_PINS[role];
  if (pin.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
}

export function createStaffToken(role: StaffRole): string {
  const payload = JSON.stringify({ role, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyStaffToken(token: string | undefined): StaffRole | null {
  if (!token || !token.includes(".")) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { role?: StaffRole };
    return data.role === "CASHIER" || data.role === "MANAGER" ? data.role : null;
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
  if (required === "CASHIER") return sessionRole === "CASHIER" || sessionRole === "MANAGER";
  return sessionRole === "MANAGER";
}
