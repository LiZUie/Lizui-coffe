"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CartPanel, type CartEntry } from "@/components/CartPanel";
import { MenuBrowser, type CartSelection } from "@/components/MenuBrowser";
import { PinGate } from "@/components/PinGate";
import { mergeCartSelection, updateCartQuantity } from "@/lib/drink-options";
import { formatDateTimeShort, formatRupiah, ORDER_STATUS_LABELS } from "@/lib/format";
import type {
  CafeTable,
  MenuItem,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
  StaffRole,
} from "@/lib/types";

export default function CashierPage() {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [tab, setTab] = useState<"POS" | "QUEUE" | "TABLES">("POS");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartEntry[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [tableCode, setTableCode] = useState("M01");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [menuRes, tableRes, orderRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/tables"),
        fetch("/api/orders"),
      ]);
      if (orderRes.status === 403) {
        setRole(null);
        return;
      }
      if (!menuRes.ok || !tableRes.ok || !orderRes.ok) {
        throw new Error("Gagal mengambil data operasional kasir.");
      }
      const m = (await menuRes.json()) as { items: MenuItem[] };
      const t = (await tableRes.json()) as { tables: CafeTable[] };
      const o = (await orderRes.json()) as { orders: Order[] };
      setMenuItems(m.items);
      setTables(t.tables);
      setOrders(o.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gangguan jaringan.");
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
    if (!role) return;
    let active = true;
    async function syncWorkspace() {
      try {
        const [menuRes, tableRes, orderRes] = await Promise.all([
          fetch("/api/menu"),
          fetch("/api/tables"),
          fetch("/api/orders"),
        ]);
        if (!active) return;
        if (orderRes.status === 403) {
          setRole(null);
          return;
        }
        if (!menuRes.ok || !tableRes.ok || !orderRes.ok) {
          throw new Error("Gagal mengambil data operasional kasir.");
        }
        const m = (await menuRes.json()) as { items: MenuItem[] };
        const t = (await tableRes.json()) as { tables: CafeTable[] };
        const o = (await orderRes.json()) as { orders: Order[] };
        setMenuItems(m.items);
        setTables(t.tables);
        setOrders(o.orders);
        setError(null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Gangguan jaringan.");
      }
    }
    void syncWorkspace();
    const timer = setInterval(() => {
      void syncWorkspace();
    }, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [role]);

  useEffect(() => {
    if (!receiptOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setReceiptOrder(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receiptOrder]);

  const activeOrders = useMemo(
    () => orders.filter((o) => ["PENDING", "PREPARING", "READY"].includes(o.status)),
    [orders],
  );

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of cart) map[e.key] = e.quantity;
    return map;
  }, [cart]);

  function handleAddToCart(selection: CartSelection) {
    setCart((prev) => mergeCartSelection(prev, selection));
    setSubmitError(null);
  }

  function handleUpdateQty(key: string, delta: number) {
    setCart((prev) => updateCartQuantity(prev, key, delta));
  }

  async function handleSubmitCashierOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const subtotal = cart.reduce((s, e) => s + e.unitPrice * e.quantity, 0);
      const total = Math.max(0, subtotal - discount);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "CASHIER",
          type: orderType,
          tableCode: orderType === "DINE_IN" ? tableCode : null,
          customerName,
          notes,
          paymentMethod,
          discount,
          cashReceived: paymentMethod === "CASH" ? cashReceived || total : undefined,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            variantLabel: c.baseVariantLabel,
            temperature: c.temperature,
            sugarLevel: c.sugarLevel,
            quantity: c.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        setSubmitError(data.error ?? "Transaksi kasir gagal disimpan.");
        return;
      }
      setReceiptOrder(data.order);
      setCart([]);
      setCustomerName("");
      setNotes("");
      setDiscount(0);
      setCashReceived(0);
      await loadWorkspaceData();
    } catch {
      setSubmitError("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOrderUpdate(
    orderId: string,
    payload: { status?: OrderStatus; paymentStatus?: "PAID" | "UNPAID" },
  ) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await loadWorkspaceData();
    }
  }

  async function handleToggleTable(code: string, nextStatus: "AVAILABLE" | "OCCUPIED") {
    const res = await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, status: nextStatus }),
    });
    if (res.ok) await loadWorkspaceData();
  }

  async function handleToggleMenu(id: string, isAvailable: boolean) {
    const res = await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isAvailable }),
    });
    if (res.ok) await loadWorkspaceData();
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    setRole(null);
  }

  if (authChecking) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-8 text-sm text-[#5E5650]">
          Memeriksa sesi kasir...
        </div>
      </AppShell>
    );
  }

  if (!role) {
    return (
      <AppShell>
        <PinGate
          requiredRole="CASHIER"
          title="Portal Kasir POS"
          subtitle="Masuk dengan akun kasir yang didaftarkan oleh Admin / Manajemen untuk mengelola transaksi dan antrean."
          demoPin="1234"
          onSuccess={(r) => setRole(r)}
        />
      </AppShell>
    );
  }

  const cashierCartPanel =
    tab === "POS" ? (
      <CartPanel
        mode="CASHIER"
        entries={cart}
        tables={tables}
        orderType={orderType}
        onOrderTypeChange={setOrderType}
        tableCode={tableCode}
        onTableCodeChange={setTableCode}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        notes={notes}
        onNotesChange={setNotes}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        discount={discount}
        onDiscountChange={setDiscount}
        cashReceived={cashReceived}
        onCashReceivedChange={setCashReceived}
        onUpdateQty={handleUpdateQty}
        onClearCart={() => setCart([])}
        onSubmit={() => void handleSubmitCashierOrder()}
        submitting={submitting}
        submitError={submitError}
      />
    ) : undefined;

  return (
    <AppShell
      rightPanel={cashierCartPanel}
      activeQueueCount={activeOrders.length}
      staffRoleLabel={role === "MANAGER" ? "Manajer" : "Kasir"}
      onLogoutStaff={() => void handleLogout()}
    >
      <div className={receiptOrder ? "no-print space-y-6" : "space-y-6"}>
        <div className="no-print flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1B18]">Kasir POS Outlet</h1>
            <p className="mt-1 text-sm text-[#5E5650]">
              Catat order langsung, terima pesanan meja dari pelanggan, dan kelola antrean.
            </p>
          </div>

          <div role="tablist" aria-label="Mode kasir" className="flex flex-wrap gap-1.5 rounded-xl border border-[#DDD5CD] bg-[#FFFFFF] p-1">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "POS"}
              onClick={() => setTab("POS")}
              className={`min-h-[44px] rounded-[10px] px-4 text-sm font-semibold ${
                tab === "POS" ? "bg-[#231F1D] text-[#FFFFFF]" : "text-[#5E5650] hover:text-[#1F1B18]"
              }`}
            >
              Order Baru
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "QUEUE"}
              onClick={() => setTab("QUEUE")}
              className={`min-h-[44px] rounded-[10px] px-4 text-sm font-semibold ${
                tab === "QUEUE" ? "bg-[#231F1D] text-[#FFFFFF]" : "text-[#5E5650] hover:text-[#1F1B18]"
              }`}
            >
              Antrean ({activeOrders.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "TABLES"}
              onClick={() => setTab("TABLES")}
              className={`min-h-[44px] rounded-[10px] px-4 text-sm font-semibold ${
                tab === "TABLES" ? "bg-[#231F1D] text-[#FFFFFF]" : "text-[#5E5650] hover:text-[#1F1B18]"
              }`}
            >
              Meja &amp; Stok
            </button>
          </div>
        </div>

        {tab === "POS" ? (
          <div className="grid grid-cols-1 gap-6">
            <MenuBrowser
              items={menuItems}
              loading={loading && menuItems.length === 0}
              error={error}
              onRetry={() => void loadWorkspaceData()}
              onAdd={handleAddToCart}
              cartQuantities={cartQuantities}
            />
            <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] xl:hidden">
              {cashierCartPanel}
            </div>
          </div>
        ) : null}

        {tab === "QUEUE" ? (
          <section aria-label="Antrean pesanan masuk" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1F1B18]">
                Antrean Pesanan ({orders.length} total)
              </h2>
              <button
                type="button"
                onClick={() => void loadWorkspaceData()}
                className="min-h-[44px] rounded-[10px] border border-[#DDD5CD] bg-[#FFFFFF] px-4 text-xs font-semibold text-[#1F1B18]"
              >
                Segarkan Antrean
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-8 text-center text-sm text-[#5E5650]">
                Belum ada pesanan masuk hari ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="flex flex-col justify-between rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-base font-bold text-[#1F1B18] tabular-nums">
                            {order.orderNumber}
                          </span>
                          <span className="ml-2 rounded-full bg-[#F3EEE9] px-2.5 py-0.5 text-xs font-semibold text-[#1F1B18]">
                            {order.source === "CUSTOMER" ? "Self-Order" : "Kasir"}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#5E5650]">
                          {formatDateTimeShort(order.createdAt)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-[#1F1B18]">
                          {order.type === "DINE_IN" ? `Meja ${order.tableCode}` : "Bawa Pulang"} •{" "}
                          {order.customerName}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-semibold ${
                            order.paymentStatus === "PAID"
                              ? "bg-[#ECFDF3] text-[#166534]"
                              : "bg-[#FFF1EB] text-[#B93815]"
                          }`}
                        >
                          {order.paymentStatus === "PAID"
                            ? `Lunas (${order.paymentMethod})`
                            : `Belum Bayar (${order.paymentMethod})`}
                        </span>
                        <span className="rounded-full bg-[#F3B68D] px-2.5 py-0.5 font-bold text-[#1F1B18]">
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>

                      {order.notes ? (
                        <p className="mt-2 rounded-lg bg-[#FAF7F4] px-2.5 py-1.5 text-xs text-[#5E5650]">
                          Catatan: {order.notes}
                        </p>
                      ) : null}

                      <ul className="mt-3 space-y-1 border-t border-[#F0EAE3] pt-2.5 text-sm">
                        {order.items.map((it) => (
                          <li key={it.id} className="flex justify-between">
                            <span>
                              {it.itemName} ({it.variantLabel}) x{it.quantity}
                            </span>
                            <span className="font-semibold tabular-nums">{formatRupiah(it.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 space-y-3 border-t border-[#F0EAE3] pt-3">
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className="text-[#B8551E] tabular-nums">{formatRupiah(order.total)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {order.paymentStatus === "UNPAID" && order.status !== "CANCELLED" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleOrderUpdate(order.id, {
                                paymentStatus: "PAID",
                                status: order.status === "PENDING" ? "PREPARING" : order.status,
                              })
                            }
                            className="min-h-[40px] rounded-[10px] bg-[#166534] px-3 text-xs font-bold text-[#FFFFFF]"
                          >
                            Konfirmasi Bayar ({order.paymentMethod})
                          </button>
                        ) : null}

                        {order.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => void handleOrderUpdate(order.id, { status: "PREPARING" })}
                            className="min-h-[40px] rounded-[10px] bg-[#231F1D] px-3 text-xs font-bold text-[#FFFFFF]"
                          >
                            Proses Barista
                          </button>
                        ) : null}

                        {order.status === "PREPARING" ? (
                          <button
                            type="button"
                            onClick={() => void handleOrderUpdate(order.id, { status: "READY" })}
                            className="min-h-[40px] rounded-[10px] bg-[#B8551E] px-3 text-xs font-bold text-[#FFFFFF]"
                          >
                            Tandai Siap
                          </button>
                        ) : null}

                        {order.status === "READY" ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleOrderUpdate(order.id, { status: "COMPLETED", paymentStatus: "PAID" })
                            }
                            className="min-h-[40px] rounded-[10px] bg-[#166534] px-3 text-xs font-bold text-[#FFFFFF]"
                          >
                            Selesaikan
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setReceiptOrder(order)}
                          className="min-h-[40px] rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-xs font-semibold text-[#1F1B18]"
                        >
                          Lihat Struk
                        </button>

                        {["PENDING", "PREPARING"].includes(order.status) ? (
                          <button
                            type="button"
                            onClick={() => void handleOrderUpdate(order.id, { status: "CANCELLED" })}
                            className="min-h-[40px] rounded-[10px] border border-[#E8CFC4] bg-[#FFF1EB] px-3 text-xs font-semibold text-[#B93815]"
                          >
                            Batalkan
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "TABLES" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-label="Status meja outlet" className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
              <h2 className="text-lg font-bold text-[#1F1B18]">Kelola Meja (M01 sampai M10)</h2>
              <p className="mt-1 text-xs text-[#5E5650]">
                Klik meja untuk mengubah status tersedia atau terisi. Link QR meja: <code>/?table=M01</code>.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tables.map((t) => {
                  const occupied = t.status === "OCCUPIED";
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void handleToggleTable(t.code, occupied ? "AVAILABLE" : "OCCUPIED")}
                      className={`min-h-[76px] rounded-xl border p-3 text-left transition-colors ${
                        occupied
                          ? "border-[#B93815] bg-[#FFF1EB]"
                          : "border-[#DDD5CD] bg-[#FAF7F4] hover:bg-[#F3EEE9]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-[#1F1B18]">{t.code}</span>
                        <span
                          className={`text-xs font-bold ${
                            occupied ? "text-[#B93815]" : "text-[#166534]"
                          }`}
                        >
                          {occupied ? "Terisi" : "Kosong"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5E5650]">
                        {t.area} • {t.capacity} kursi
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-label="Ketersediaan menu cepat" className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-5">
              <h2 className="text-lg font-bold text-[#1F1B18]">Ketersediaan Menu</h2>
              <p className="mt-1 text-xs text-[#5E5650]">
                Menandai menu habis akan langsung mengunci tombol pesan di halaman pelanggan.
              </p>
              <div className="mt-4 divide-y divide-[#F0EAE3]">
                {menuItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-[#1F1B18]">{item.name}</p>
                      <p className="text-xs text-[#5E5650] tabular-nums">{formatRupiah(item.price)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleMenu(item.id, !item.isAvailable)}
                      className={`min-h-[40px] rounded-[10px] px-3.5 text-xs font-bold ${
                        item.isAvailable
                          ? "bg-[#ECFDF3] text-[#166534]"
                          : "bg-[#FFF1EB] text-[#B93815]"
                      }`}
                    >
                      {item.isAvailable ? "Tersedia" : "Habis"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {receiptOrder ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Struk pesanan"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:inset-auto print:block print:bg-transparent print:p-0"
        >
          <div className="mx-auto w-full max-w-sm rounded-2xl bg-[#FFFFFF] p-6 print:max-w-[320px] print:rounded-none print:border print:border-[#DDD5CD] print:p-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-[#1F1B18]">Lizui Coffee</h2>
              <p className="text-xs text-[#5E5650]">Struk Transaksi • {receiptOrder.orderNumber}</p>
              <p className="mt-1 text-xs text-[#5E5650]">{formatDateTimeShort(receiptOrder.createdAt)}</p>
            </div>

            <div className="my-4 space-y-1 border-y border-dashed border-[#DDD5CD] py-3 text-sm">
              <div className="flex justify-between text-xs text-[#5E5650]">
                <span>Tipe</span>
                <span className="font-semibold text-[#1F1B18]">
                  {receiptOrder.type === "DINE_IN" ? `Dine-in (${receiptOrder.tableCode})` : "Bawa Pulang"}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#5E5650]">
                <span>Pelanggan</span>
                <span className="font-semibold text-[#1F1B18]">{receiptOrder.customerName}</span>
              </div>
              <div className="pt-2">
                {receiptOrder.items.map((it) => (
                  <div key={it.id} className="flex justify-between py-0.5 text-xs">
                    <span>
                      {it.itemName} ({it.variantLabel}) x{it.quantity}
                    </span>
                    <span className="font-semibold tabular-nums">{formatRupiah(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-xs text-[#5E5650]">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatRupiah(receiptOrder.subtotal)}</span>
              </div>
              {receiptOrder.discount > 0 ? (
                <div className="flex justify-between text-xs text-[#166534]">
                  <span>Diskon</span>
                  <span className="tabular-nums">-{formatRupiah(receiptOrder.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-[#1F1B18]">
                <span>Total ({receiptOrder.paymentMethod})</span>
                <span className="tabular-nums">{formatRupiah(receiptOrder.total)}</span>
              </div>
              {receiptOrder.paymentMethod === "CASH" && receiptOrder.cashReceived > 0 ? (
                <>
                  <div className="flex justify-between text-xs text-[#5E5650]">
                    <span>Tunai</span>
                    <span className="tabular-nums">{formatRupiah(receiptOrder.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold text-[#166534]">
                    <span>Kembalian</span>
                    <span className="tabular-nums">{formatRupiah(receiptOrder.cashChange)}</span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-4 border-t border-dashed border-[#DDD5CD] pt-3 text-center text-xs text-[#5E5650]">
              Terima kasih telah berkunjung ke Lizui Coffee
            </div>

            <div className="no-print mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] flex-1 rounded-[10px] bg-[#231F1D] text-sm font-semibold text-[#FFFFFF]"
              >
                Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="min-h-[44px] flex-1 rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] text-sm font-semibold text-[#1F1B18]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
