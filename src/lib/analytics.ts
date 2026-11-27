import type { AnalyticsSummary, MenuCategory, MenuItem, Order, TopMenuEntry, TrendPoint } from "./types";

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function filterOrdersByPeriod(
  orders: Order[],
  period: "today" | "7d" | "30d",
  now = new Date(),
): Order[] {
  const todayStart = startOfDay(now);
  const cutoff = new Date(todayStart);
  if (period === "7d") cutoff.setDate(cutoff.getDate() - 6);
  if (period === "30d") cutoff.setDate(cutoff.getDate() - 29);

  return orders.filter((order) => {
    if (order.status === "CANCELLED") return false;
    const created = new Date(order.createdAt);
    return !Number.isNaN(created.getTime()) && created >= cutoff;
  });
}

export function computeAnalytics(
  allOrders: Order[],
  menuItems: MenuItem[],
  period: "today" | "7d" | "30d",
  now = new Date(),
): AnalyticsSummary {
  const scopedOrders = filterOrdersByPeriod(allOrders, period, now);
  const menuCategoryById = new Map<string, MenuCategory>();
  for (const item of menuItems) {
    menuCategoryById.set(item.id, item.category);
  }

  let totalRevenue = 0;
  let dineInCount = 0;
  let takeAwayCount = 0;
  let customerSourceCount = 0;
  let cashierSourceCount = 0;
  let cashRevenue = 0;
  let qrisRevenue = 0;

  const menuAgg = new Map<
    string,
    {
      menuItemId: string;
      itemName: string;
      category: MenuCategory;
      quantitySold: number;
      revenue: number;
      variantCounts: Map<string, number>;
    }
  >();

  const categoryAgg = new Map<MenuCategory, { quantity: number; revenue: number }>();

  for (const order of scopedOrders) {
    totalRevenue += order.total;
    if (order.type === "DINE_IN") dineInCount += 1;
    else takeAwayCount += 1;

    if (order.source === "CUSTOMER") customerSourceCount += 1;
    else cashierSourceCount += 1;

    if (order.paymentMethod === "CASH") cashRevenue += order.total;
    else qrisRevenue += order.total;

    for (const item of order.items) {
      const category = menuCategoryById.get(item.menuItemId) ?? "COFFEE";
      const current = menuAgg.get(item.menuItemId) ?? {
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        category,
        quantitySold: 0,
        revenue: 0,
        variantCounts: new Map<string, number>(),
      };
      current.quantitySold += item.quantity;
      current.revenue += item.lineTotal;
      current.variantCounts.set(
        item.variantLabel,
        (current.variantCounts.get(item.variantLabel) ?? 0) + item.quantity,
      );
      menuAgg.set(item.menuItemId, current);

      const catCurrent = categoryAgg.get(category) ?? { quantity: 0, revenue: 0 };
      catCurrent.quantity += item.quantity;
      catCurrent.revenue += item.lineTotal;
      categoryAgg.set(category, catCurrent);
    }
  }

  const trend = buildTrend(scopedOrders, period, now);

  const topMenus: TopMenuEntry[] = Array.from(menuAgg.values())
    .map((entry) => {
      let topVariant = "-";
      let maxCount = -1;
      for (const [variant, count] of entry.variantCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          topVariant = variant;
        }
      }
      return {
        menuItemId: entry.menuItemId,
        itemName: entry.itemName,
        category: entry.category,
        topVariant,
        quantitySold: entry.quantitySold,
        revenue: entry.revenue,
      };
    })
    .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue);

  const categoryBreakdown = Array.from(categoryAgg.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalOrders = scopedOrders.length;
  return {
    period,
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    dineInCount,
    takeAwayCount,
    customerSourceCount,
    cashierSourceCount,
    cashRevenue,
    qrisRevenue,
    trend,
    topMenus,
    categoryBreakdown,
    orders: scopedOrders,
  };
}

function buildTrend(orders: Order[], period: "today" | "7d" | "30d", now: Date): TrendPoint[] {
  if (period === "today") {
    const startHour = 8;
    const endHour = Math.max(21, now.getHours());
    const buckets = new Map<number, TrendPoint>();
    for (let h = startHour; h <= endHour; h++) {
      buckets.set(h, { label: `${String(h).padStart(2, "0")}:00`, revenue: 0, orders: 0 });
    }
    for (const order of orders) {
      const h = new Date(order.createdAt).getHours();
      const bucket = buckets.get(h) ?? { label: `${String(h).padStart(2, "0")}:00`, revenue: 0, orders: 0 };
      bucket.revenue += order.total;
      bucket.orders += 1;
      buckets.set(h, bucket);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  }

  const days = period === "7d" ? 7 : 30;
  const today = startOfDay(now);
  const buckets = new Map<string, TrendPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    buckets.set(key, { label, revenue: 0, orders: 0 });
  }
  for (const order of orders) {
    const d = startOfDay(new Date(order.createdAt));
    const key = d.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.revenue += order.total;
      bucket.orders += 1;
    }
  }
  return Array.from(buckets.values());
}

function csvCell(value: string | number | null | undefined): string {
  const raw = String(value ?? "");
  // Prefix spreadsheet formula triggers to prevent CSV formula injection in Excel/Sheets.
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildOrdersCsv(summary: AnalyticsSummary): string {
  const lines: string[] = [];
  lines.push(["LAPORAN PENJUALAN LIZUI COFFEE", `Periode: ${summary.period}`].map(csvCell).join(","));
  lines.push(["Total Omzet (IDR)", summary.totalRevenue, "Total Pesanan", summary.totalOrders].map(csvCell).join(","));
  lines.push("");
  lines.push(
    [
      "Nomor Order",
      "Waktu",
      "Sumber",
      "Tipe",
      "Meja",
      "Pelanggan",
      "Item",
      "Metode Bayar",
      "Status Bayar",
      "Status Order",
      "Total (IDR)",
    ]
      .map(csvCell)
      .join(","),
  );

  for (const order of summary.orders) {
    const itemSummary = order.items.map((it) => `${it.itemName} (${it.variantLabel}) x${it.quantity}`).join("; ");
    lines.push(
      [
        order.orderNumber,
        order.createdAt,
        order.source,
        order.type,
        order.tableCode ?? "-",
        order.customerName,
        itemSummary,
        order.paymentMethod,
        order.paymentStatus,
        order.status,
        order.total,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  lines.push("");
  lines.push(["PERINGKAT MENU TERLARIS", "Kategori", "Varian Terpopuler", "Qty Terjual", "Omzet (IDR)"].map(csvCell).join(","));
  for (const menu of summary.topMenus) {
    lines.push(
      [menu.itemName, menu.category, menu.topVariant, menu.quantitySold, menu.revenue].map(csvCell).join(","),
    );
  }

  return lines.join("\n");
}
