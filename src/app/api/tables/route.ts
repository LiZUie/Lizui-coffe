import { NextResponse } from "next/server";
import { getTables, setTableStatus } from "@/lib/db";
import { getStaffSessionRole, hasRoleAccess } from "@/lib/auth";
import type { TableStatus } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ tables: getTables() });
}

export async function PATCH(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "CASHIER")) {
    return NextResponse.json({ error: "Login staf diperlukan" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as { code?: string; status?: TableStatus };
    if (!body.code || (body.status !== "AVAILABLE" && body.status !== "OCCUPIED")) {
      return NextResponse.json({ error: "Status meja tidak valid" }, { status: 400 });
    }
    const table = setTableStatus(body.code, body.status);
    return NextResponse.json({ table });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal memperbarui meja" }, { status: 400 });
  }
}
