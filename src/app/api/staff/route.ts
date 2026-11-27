import { NextResponse } from "next/server";
import { getStaffSessionRole, hasRoleAccess } from "@/lib/auth";
import { createCashierAccount, deleteCashierAccount, listStaffAccounts } from "@/lib/db";

export async function GET() {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "MANAGER")) {
    return NextResponse.json({ error: "Akses khusus Admin/Manajemen." }, { status: 403 });
  }
  return NextResponse.json({ staff: listStaffAccounts() });
}

export async function POST(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "MANAGER")) {
    return NextResponse.json({ error: "Hanya Admin/Manajemen yang dapat membuat akun kasir." }, { status: 403 });
  }
  try {
    const body = (await req.json()) as {
      name?: string;
      username?: string;
      password?: string;
    };
    const account = createCashierAccount({
      name: String(body.name ?? ""),
      username: String(body.username ?? ""),
      password: String(body.password ?? ""),
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat akun kasir." },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "MANAGER")) {
    return NextResponse.json({ error: "Hanya Admin/Manajemen yang dapat menghapus akun kasir." }, { status: 403 });
  }
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    if (!id) {
      return NextResponse.json({ error: "ID akun wajib disertakan." }, { status: 400 });
    }
    deleteCashierAccount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus akun kasir." },
      { status: 400 },
    );
  }
}
