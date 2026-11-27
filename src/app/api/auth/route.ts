import { NextResponse } from "next/server";
import {
  createStaffToken,
  getStaffSessionRole,
  STAFF_COOKIE_NAME,
  verifyPin,
} from "@/lib/auth";
import { authenticateStaffAccount } from "@/lib/db";
import type { StaffRole } from "@/lib/types";

export async function GET() {
  const role = await getStaffSessionRole();
  return NextResponse.json({ role });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      role?: StaffRole;
      username?: string;
      password?: string;
      pin?: string;
    };
    const requiredRole: StaffRole = body.role === "MANAGER" ? "MANAGER" : "CASHIER";
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const pin = String(body.pin ?? "").trim();

    let resolvedRole: StaffRole | null = null;
    let staffName: string | undefined;

    if (username && password) {
      const account = authenticateStaffAccount(username, password, requiredRole);
      if (!account) {
        return NextResponse.json(
          {
            error:
              requiredRole === "MANAGER"
                ? "Kredensial tidak valid atau akun bukan Admin/Manajemen."
                : "Email/username atau password kasir salah.",
          },
          { status: 401 },
        );
      }
      resolvedRole = account.role;
      staffName = account.name;
    } else if (pin) {
      if (!verifyPin(requiredRole, pin)) {
        return NextResponse.json({ error: "PIN salah. Coba lagi." }, { status: 401 });
      }
      resolvedRole = requiredRole;
    } else {
      return NextResponse.json({ error: "Masukkan email/username dan password." }, { status: 400 });
    }

    const token = createStaffToken(resolvedRole);
    const res = NextResponse.json({ role: resolvedRole, name: staffName });
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
