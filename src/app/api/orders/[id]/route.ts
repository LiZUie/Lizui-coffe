import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/db";
import { getStaffSessionRole, hasRoleAccess } from "@/lib/auth";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "CASHIER")) {
    return NextResponse.json({ error: "Login staf diperlukan" }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const body = (await req.json()) as {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      cashReceived?: number;
    };
    const order = updateOrderStatus(id, {
      status: body.status,
      paymentStatus: body.paymentStatus,
      cashReceived: body.cashReceived,
    });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal memperbarui pesanan" }, { status: 400 });
  }
}
