import { NextResponse } from "next/server";
import { createOrder, getOrderById, listOrders } from "@/lib/db";
import {
  checkRateLimit,
  getClientIp,
  getStaffSessionRole,
  hasRoleAccess,
  verifySameOrigin,
} from "@/lib/auth";
import type { DrinkTemperature, OrderSource, OrderType, PaymentMethod, SugarLevel } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  const role = await getStaffSessionRole();

  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
    const orders = ids.map((id) => getOrderById(id)).filter((o): o is NonNullable<typeof o> => Boolean(o));
    return NextResponse.json({ orders });
  }

  if (!hasRoleAccess(role, "CASHIER")) {
    return NextResponse.json({ error: "Login staf diperlukan untuk melihat semua antrean" }, { status: 403 });
  }

  return NextResponse.json({ orders: listOrders(150) });
}

export async function POST(req: Request) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json({ error: "Origin permintaan tidak diizinkan." }, { status: 403 });
  }
  const limit = checkRateLimit(`orders:${getClientIp(req)}`, 25, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak pesanan dalam waktu singkat. Mohon tunggu sebentar." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }
  try {
    const body = (await req.json()) as {
      source?: OrderSource;
      type?: OrderType;
      tableCode?: string | null;
      customerName?: string;
      notes?: string;
      paymentMethod?: PaymentMethod;
      cashReceived?: number;
      discount?: number;
      items?: Array<{
        menuItemId: string;
        variantLabel: string;
        temperature?: DrinkTemperature;
        sugarLevel?: SugarLevel;
        quantity: number;
      }>;
    };

    const requestedSource: OrderSource = body.source === "CASHIER" ? "CASHIER" : "CUSTOMER";
    const role = await getStaffSessionRole();
    if (requestedSource === "CASHIER" && !hasRoleAccess(role, "CASHIER")) {
      return NextResponse.json({ error: "Login kasir diperlukan" }, { status: 403 });
    }

    const order = createOrder({
      source: requestedSource,
      type: body.type === "TAKE_AWAY" ? "TAKE_AWAY" : "DINE_IN",
      tableCode: body.tableCode ?? null,
      customerName: body.customerName,
      notes: body.notes,
      paymentMethod: body.paymentMethod === "CASH" ? "CASH" : "QRIS",
      cashReceived: requestedSource === "CASHIER" ? body.cashReceived : undefined,
      markPaid: requestedSource === "CASHIER",
      discount: requestedSource === "CASHIER" ? body.discount : 0,
      items: body.items ?? [],
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal membuat pesanan" }, { status: 400 });
  }
}
