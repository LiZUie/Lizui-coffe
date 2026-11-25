import { NextResponse } from "next/server";
import {
  createStaffToken,
  getStaffSessionRole,
  STAFF_COOKIE_NAME,
  verifyPin,
} from "@/lib/auth";
import type { StaffRole } from "@/lib/types";

export async function GET() {
  const role = await getStaffSessionRole();
  return NextResponse.json({ role });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { role?: StaffRole; pin?: string };
    const role: StaffRole = body.role === "MANAGER" ? "MANAGER" : "CASHIER";
    const pin = String(body.pin ?? "").trim();

    if (!verifyPin(role, pin)) {
      return NextResponse.json({ error: "PIN salah. Coba lagi." }, { status: 401 });
    }

    const token = createStaffToken(role);
    const res = NextResponse.json({ role });
    res.cookies.set(STAFF_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid" }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(STAFF_COOKIE_NAME);
  return res;
}
