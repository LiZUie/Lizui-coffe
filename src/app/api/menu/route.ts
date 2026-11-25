import { NextResponse } from "next/server";
import { createMenuItem, getMenuItems, toggleMenuAvailability } from "@/lib/db";
import { getStaffSessionRole, hasRoleAccess } from "@/lib/auth";
import type { MenuCategory } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ items: getMenuItems() });
}

export async function POST(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "MANAGER")) {
    return NextResponse.json({ error: "Akses khusus Manajer" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as {
      name?: string;
      category?: MenuCategory;
      description?: string;
      price?: number;
      visualKey?: string;
      variants?: Array<{ label: string; priceDelta: number }>;
    };
    const item = createMenuItem({
      name: body.name ?? "",
      category: body.category ?? "COFFEE",
      description: body.description ?? "",
      price: Number(body.price ?? 0),
      visualKey: body.visualKey,
      variants: body.variants,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal menambah menu" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "CASHIER")) {
    return NextResponse.json({ error: "Login staf diperlukan" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as { id?: string; isAvailable?: boolean };
    if (!body.id || typeof body.isAvailable !== "boolean") {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }
    const item = toggleMenuAvailability(body.id, body.isAvailable);
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal memperbarui menu" }, { status: 400 });
  }
}
