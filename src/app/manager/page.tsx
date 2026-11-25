"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PinGate } from "@/components/PinGate";
import { CATEGORY_LABELS, formatDateTimeShort, formatRupiah } from "@/lib/format";
import type { AnalyticsSummary, MenuCategory, MenuItem, StaffRole, TrendPoint } from "@/lib/types";

function RevenueTrendChart({ trend }: { trend: TrendPoint[] }) {
  const maxRevenue = Math.max(...trend.map((t) => t.revenue), 1);
  const maxOrders = Math.max(...trend.map((t) => t.orders), 1);

  if (trend.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#DDD5CD] bg-[#FAF7F4] p-6 text-center text-sm text-[#5E5650]">
        Belum ada data transaksi pada periode ini.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${Math.max(560, trend.length * 46)} 220`}
          className="h-56 w-full min-w-[520px]"
          role="img"
          aria-label="Grafik tren omzet dan jumlah pesanan"
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = 180 - ratio * 145;
            return (
              <line
                key={ratio}
                x1="12"
                x2={Math.max(548, trend.length * 46 - 12)}
                y1={y}
                y2={y}
                stroke="#EFEAE4"
                strokeWidth="1"
              />
            );
          })}

          {trend.map((point, index) => {
            const totalWidth = Math.max(560, trend.length * 46);
            const slot = (totalWidth - 24) / trend.length;
            const barWidth = Math.min(28, Math.max(12, slot * 0.58));
            const x = 12 + index * slot + (slot - barWidth) / 2;
            const barHeight = point.revenue > 0 ? Math.max(8, (point.revenue / maxRevenue) * 140) : 2;
            const y = 180 - barHeight;
            const showLabel = trend.length <= 14 || index % 3 === 0 || index === trend.length - 1;

            return (
              <g key={point.label}>
                <title>
                  {`${point.label}: ${formatRupiah(point.revenue)} (${point.orders} pesanan)`}
                </title>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  fill={point.revenue > 0 ? "#B8551E" : "#E4DDD6"}
                />
                {point.orders > 0 && trend.length <= 16 ? (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#1F1B18"
                  >
                    {point.orders}
                  </text>
                ) : null}
                {showLabel ? (
                  <text
                    x={x + barWidth / 2}
                    y="202"
                    textAnchor="middle"
                    fontSize="10"
                    fill="#5E5650"
                  >
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EAE3] pt-2 text-xs text-[#5E5650]">
        <span>Tinggi batang menunjukkan omzet (Rp). Angka di atas batang adalah jumlah order.</span>
        <span className="font-semibold text-[#1F1B18] tabular-nums">
          Puncak: {formatRupiah(maxRevenue)} • Maks {maxOrders} order
        </span>
      </div>
    </div>
  );
}

export default function ManagerDashboardPage() {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("7d");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<MenuCategory>("COFFEE");
  const [newPrice, setNewPrice] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [savingMenu, setSavingMenu] = useState(false);
  const [menuMsg, setMenuMsg] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (selectedPeriod: "today" | "7d" | "30d") => {
    setLoading(true);
    setError(null);
    try {
      const [anaRes, menuRes] = await Promise.all([
        fetch(`/api/analytics?period=${selectedPeriod}`),
        fetch("/api/menu"),
      ]);
      if (anaRes.status === 403) {
        setRole(null);
        return;
      }
      if (!anaRes.ok || !menuRes.ok) {
        throw new Error("Gagal memuat laporan analitik.");
      }
      const ana = (await anaRes.json()) as AnalyticsSummary;
      const m = (await menuRes.json()) as { items: MenuItem[] };
      setSummary(ana);
      setMenuItems(m.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth");
        const data = (await res.json()) as { role: StaffRole | null };
        setRole(data.role);
      } finally {
        setAuthChecking(false);
      }
    }
    void checkSession();
  }, []);

  useEffect(() => {
    if (role !== "MANAGER") return;
    let active = true;
    async function fetchInitial() {
      try {
        const [anaRes, menuRes] = await Promise.all([
          fetch(`/api/analytics?period=${period}`),
          fetch("/api/menu"),
        ]);
        if (!active) return;
        if (anaRes.status === 403) {
          setRole(null);
          return;
        }
        if (!anaRes.ok || !menuRes.ok) {
          throw new Error("Gagal memuat laporan analitik.");
        }
        const ana = (await anaRes.json()) as AnalyticsSummary;
        const m = (await menuRes.json()) as { items: MenuItem[] };
        setSummary(ana);
        setMenuItems(m.items);
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      }
    }
    void fetchInitial();
    return () => {
      active = false;
    };
  }, [role, period]);

  async function handleAddMenu(e: React.FormEvent) {
    e.preventDefault();
    setSavingMenu(true);
    setMenuMsg(null);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          category: newCategory,
          price: Number(newPrice),
          description: newDesc,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMenuMsg(data.error ?? "Gagal menambah menu.");
        return;
      }
      setNewName("");
      setNewPrice("");
      setNewDesc("");
      setMenuMsg("Menu baru berhasil ditambahkan ke katalog.");
      await loadAnalytics(period);
    } finally {
      setSavingMenu(false);
    }
  }

  async function handleToggleMenu(id: string, isAvailable: boolean) {
    await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isAvailable }),
    });
    await loadAnalytics(period);
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    setRole(null);
  }

  if (authChecking) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-8 text-sm text-[#5E5650]">
          Memeriksa sesi manajer...
        </div>
      </AppShell>
    );
  }

  if (role !== "MANAGER") {
    return (
      <AppShell>
        <PinGate
          requiredRole="MANAGER"
          title="Masuk Dashboard Manajer"
          subtitle="Masukkan PIN Manajer untuk melihat grafik perkembangan kafe, menu terlaris, dan export laporan."
          demoPin="9999"
          onSuccess={(r) => setRole(r)}
        />
      </AppShell>
    );
  }

  const maxTopQty = Math.max(...(summary?.topMenus.map((m) => m.quantitySold) ?? [1]), 1);
  const totalTypeCount = Math.max((summary?.dineInCount ?? 0) + (summary?.takeAwayCount ?? 0), 1);
  const dineInPct = Math.round(((summary?.dineInCount ?? 0) / totalTypeCount) * 100);
  const takeAwayPct = 100 - dineInPct;

  return (
    <AppShell staffRoleLabel="Manajer" onLogoutStaff={() => void handleLogout()}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1B18]">
              Dashboard Monitoring Kafe
            </h1>
            <p className="mt-1 text-sm text-[#5E5650]">
              Pantau perkembangan omzet, tren transaksi, menu paling sering dibeli, dan export laporan.
            </p>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Rentang laporan" className="inline-flex rounded-xl border border-[#DDD5CD] bg-[#FFFFFF] p-1">
              {[
                { id: "today", label: "Hari Ini" },
                { id: "7d", label: "7 Hari" },
                { id: "30d", label: "30 Hari" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={period === opt.id}
                  onClick={() => setPeriod(opt.id as "today" | "7d" | "30d")}
                  className={`min-h-[40px] rounded-[10px] px-3.5 text-xs font-bold ${
                    period === opt.id
                      ? "bg-[#231F1D] text-[#FFFFFF]"
                      : "text-[#5E5650] hover:text-[#1F1B18]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <a
              href={`/api/analytics?period=${period}&format=csv`}
              className="inline-flex min-h-[44px] items-center rounded-[10px] bg-[#B8551E] px-4 text-xs font-bold text-[#FFFFFF] hover:bg-[#9E4616]"
            >
              Export CSV (Excel)
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] rounded-[10px] border border-[#DDD5CD] bg-[#FFFFFF] px-4 text-xs font-bold text-[#1F1B18] hover:bg-[#F3EEE9]"
            >
              Cetak / PDF
            </button>
          </div>
        </div>

        {loading && !summary ? (
          <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-8 text-sm text-[#5E5650]">
            Memuat data analitik kafe...
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-[#B93815] bg-[#FFF1EB] p-6 text-sm text-[#B93815]">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => void loadAnalytics(period)}
              className="mt-3 min-h-[44px] rounded-[10px] bg-[#B8551E] px-4 font-semibold text-[#FFFFFF]"
            >
              Coba Lagi
            </button>
          </div>
        ) : summary ? (
          <>
            <section aria-label="Ringkasan KPI" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <p className="text-xs font-semibold text-[#5E5650]">Total Omzet</p>
                <p className="mt-2 text-2xl font-bold text-[#1F1B18] tabular-nums">
                  {formatRupiah(summary.totalRevenue)}
                </p>
                <p className="mt-1 text-xs text-[#5E5650]">
                  Tunai {formatRupiah(summary.cashRevenue)} • QRIS {formatRupiah(summary.qrisRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <p className="text-xs font-semibold text-[#5E5650]">Total Pesanan</p>
                <p className="mt-2 text-2xl font-bold text-[#1F1B18] tabular-nums">
                  {summary.totalOrders}
                </p>
                <p className="mt-1 text-xs text-[#5E5650]">
                  Self-Order {summary.customerSourceCount} • Kasir {summary.cashierSourceCount}
                </p>
              </div>

              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <p className="text-xs font-semibold text-[#5E5650]">Rata-rata per Transaksi</p>
                <p className="mt-2 text-2xl font-bold text-[#1F1B18] tabular-nums">
                  {formatRupiah(summary.averageOrderValue)}
                </p>
                <p className="mt-1 text-xs text-[#5E5650]">Nilai belanja rata-rata pelanggan</p>
              </div>

              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <p className="text-xs font-semibold text-[#5E5650]">Meja vs Bawa Pulang</p>
                <p className="mt-2 text-2xl font-bold text-[#1F1B18] tabular-nums">
                  {summary.dineInCount} / {summary.takeAwayCount}
                </p>
                <p className="mt-1 text-xs text-[#5E5650]">
                  Dine-in {dineInPct}% • Take away {takeAwayPct}%
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5 xl:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F1B18]">Grafik Perkembangan Penjualan</h2>
                    <p className="text-xs text-[#5E5650]">
                      {period === "today" ? "Distribusi omzet per jam hari ini" : `Tren omzet harian (${period})`}
                    </p>
                  </div>
                </div>
                <RevenueTrendChart trend={summary.trend} />
              </div>

              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <h2 className="text-lg font-bold text-[#1F1B18]">Komposisi Order &amp; Kategori</h2>
                <p className="mt-1 text-xs text-[#5E5650]">Perbandingan kanal &amp; kategori terjual</p>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-[#1F1B18]">
                      <span>Dine-in ({summary.dineInCount})</span>
                      <span>Take away ({summary.takeAwayCount})</span>
                    </div>
                    <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-[#F3EEE9]">
                      <div style={{ width: `${dineInPct}%` }} className="bg-[#B8551E]" />
                      <div style={{ width: `${takeAwayPct}%` }} className="bg-[#231F1D]" />
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t border-[#F0EAE3] pt-3">
                    <p className="text-xs font-bold text-[#1F1B18]">Omzet per Kategori</p>
                    {summary.categoryBreakdown.length === 0 ? (
                      <p className="text-xs text-[#5E5650]">Belum ada penjualan kategori.</p>
                    ) : (
                      summary.categoryBreakdown.map((cat) => {
                        const pct = summary.totalRevenue > 0 ? Math.round((cat.revenue / summary.totalRevenue) * 100) : 0;
                        return (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-[#1F1B18]">
                                {CATEGORY_LABELS[cat.category]} ({cat.quantity})
                              </span>
                              <span className="font-semibold text-[#5E5650] tabular-nums">
                                {formatRupiah(cat.revenue)} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#F3EEE9]">
                              <div style={{ width: `${pct}%` }} className="h-full bg-[#F3B68D]" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <h2 className="text-lg font-bold text-[#1F1B18]">Menu Paling Sering Dibeli Customer</h2>
                <p className="mt-1 text-xs text-[#5E5650]">
                  Peringkat produk terlaris beserta varian paling sering dipilih
                </p>

                {summary.topMenus.length === 0 ? (
                  <p className="mt-4 text-sm text-[#5E5650]">Belum ada penjualan menu pada periode ini.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {summary.topMenus.slice(0, 8).map((item, idx) => {
                      const widthPct = Math.round((item.quantitySold / maxTopQty) * 100);
                      return (
                        <div key={item.menuItemId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="min-w-0">
                              <span className="mr-2 font-bold text-[#B8551E] tabular-nums">#{idx + 1}</span>
                              <span className="font-bold text-[#1F1B18]">{item.itemName}</span>
                              <span className="ml-2 text-xs text-[#5E5650]">({item.topVariant})</span>
                            </div>
                            <span className="shrink-0 text-xs font-bold text-[#1F1B18] tabular-nums">
                              {item.quantitySold} terjual • {formatRupiah(item.revenue)}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-[#F3EEE9]">
                            <div style={{ width: `${widthPct}%` }} className="h-full rounded-full bg-[#B8551E]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <h2 className="text-lg font-bold text-[#1F1B18]">Transaksi Terbaru</h2>
                <p className="mt-1 text-xs text-[#5E5650]">Data yang ikut terekspor ke file CSV</p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#DDD5CD] text-[#5E5650]">
                        <th className="py-2 pr-3 font-semibold">Order</th>
                        <th className="py-2 pr-3 font-semibold">Sumber &amp; Tipe</th>
                        <th className="py-2 pr-3 font-semibold">Waktu</th>
                        <th className="py-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE3]">
                      {summary.orders.slice(0, 8).map((o) => (
                        <tr key={o.id}>
                          <td className="py-2.5 pr-3 font-bold text-[#1F1B18] tabular-nums">
                            {o.orderNumber}
                          </td>
                          <td className="py-2.5 pr-3 text-[#5E5650]">
                            {o.source === "CUSTOMER" ? "Customer" : "Kasir"} •{" "}
                            {o.type === "DINE_IN" ? `Meja ${o.tableCode}` : "Take away"}
                          </td>
                          <td className="py-2.5 pr-3 text-[#5E5650]">
                            {formatDateTimeShort(o.createdAt)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-[#1F1B18] tabular-nums">
                            {formatRupiah(o.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="no-print grid grid-cols-1 gap-6 xl:grid-cols-2">
              <form
                onSubmit={(e) => void handleAddMenu(e)}
                className="space-y-4 rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5"
              >
                <h2 className="text-lg font-bold text-[#1F1B18]">Tambah Menu Baru</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-menu-name" className="block text-xs font-semibold text-[#1F1B18]">
                      Nama Menu
                    </label>
                    <input
                      id="new-menu-name"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Caramel Macchiato"
                      className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-menu-cat" className="block text-xs font-semibold text-[#1F1B18]">
                      Kategori
                    </label>
                    <select
                      id="new-menu-cat"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as MenuCategory)}
                      className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="new-menu-price" className="block text-xs font-semibold text-[#1F1B18]">
                    Harga Dasar (Rp)
                  </label>
                  <input
                    id="new-menu-price"
                    type="number"
                    required
                    min={1000}
                    step={500}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="32000"
                    className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="new-menu-desc" className="block text-xs font-semibold text-[#1F1B18]">
                    Deskripsi Singkat
                  </label>
                  <input
                    id="new-menu-desc"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Espresso dengan susu steamed dan saus karamel."
                    className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm"
                  />
                </div>
                {menuMsg ? <p className="text-xs font-semibold text-[#166534]">{menuMsg}</p> : null}
                <button
                  type="submit"
                  disabled={savingMenu}
                  className="min-h-[44px] rounded-[10px] bg-[#231F1D] px-5 text-sm font-bold text-[#FFFFFF]"
                >
                  {savingMenu ? "Menyimpan..." : "Simpan Menu Baru"}
                </button>
              </form>

              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
                <h2 className="text-lg font-bold text-[#1F1B18]">Daftar Katalog Menu ({menuItems.length})</h2>
                <div className="mt-3 max-h-[320px] divide-y divide-[#F0EAE3] overflow-y-auto pr-1">
                  {menuItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-semibold text-[#1F1B18]">{item.name}</p>
                        <p className="text-xs text-[#5E5650] tabular-nums">
                          {CATEGORY_LABELS[item.category]} • {formatRupiah(item.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleMenu(item.id, !item.isAvailable)}
                        className={`min-h-[38px] rounded-[10px] px-3 text-xs font-bold ${
                          item.isAvailable
                            ? "bg-[#ECFDF3] text-[#166534]"
                            : "bg-[#FFF1EB] text-[#B93815]"
                        }`}
                      >
                        {item.isAvailable ? "Aktif" : "Habis"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
