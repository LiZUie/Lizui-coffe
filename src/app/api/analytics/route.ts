import { NextResponse } from "next/server";
import { buildOrdersCsv, computeAnalytics } from "@/lib/analytics";
import { getStaffSessionRole, hasRoleAccess } from "@/lib/auth";
import { getMenuItems, listOrders } from "@/lib/db";

export async function GET(req: Request) {
  const role = await getStaffSessionRole();
  if (!hasRoleAccess(role, "MANAGER")) {
    return NextResponse.json({ error: "Akses khusus Manajer" }, { status: 403 });
  }

  const url = new URL(req.url);
  const p = url.searchParams.get("period");
  const period: "today" | "7d" | "30d" = p === "today" || p === "30d" ? p : "7d";
  const format = url.searchParams.get("format");

  const summary = computeAnalytics(listOrders(500), getMenuItems(), period);

  if (format === "csv") {
    const csv = buildOrdersCsv(summary);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse("\uFEFF" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-purrcoffee-${period}-${stamp}.csv"`,
      },
    });
  }

  return NextResponse.json(summary);
}
