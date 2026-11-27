"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CartPanel, type CartEntry } from "@/components/CartPanel";
import { MenuBrowser, type CartSelection } from "@/components/MenuBrowser";
import { CafeLoader } from "@/components/MenuVisual";
import { mergeCartSelection, updateCartQuantity } from "@/lib/drink-options";
import { formatDateTimeShort, formatRupiah, ORDER_STATUS_LABELS } from "@/lib/format";
import type { CafeTable, MenuItem, Order, OrderType, PaymentMethod } from "@/lib/types";

const MY_ORDERS_KEY = "purrcoffee_my_order_ids";

function StatusBadge({ status }: { status: Order["status"] }) {
  const styles: Record<Order["status"], string> = {
    PENDING: "bg-[#FFF1EB] text-[#B93815]",
    PREPARING: "bg-[#F3B68D] text-[#1F1B18]",
    READY: "bg-[#ECFDF3] text-[#166534]",
    COMPLETED: "bg-[#F3EEE9] text-[#1F1B18]",
    CANCELLED: "bg-[#FFF1EB] text-[#B93815]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export default function CustomerOrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<"MENU" | "ORDERS">("MENU");
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [tableCode, setTableCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [enteringMenu, setEnteringMenu] = useState(false);

  function handleEnterMenu() {
    setEnteringMenu(true);
    setTimeout(() => {
      setShowWelcome(false);
      setEnteringMenu(false);
    }, 320);
  }

  const [myOrderIds, setMyOrderIds] = useState<string[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [menuRes, tableRes] = await Promise.all([fetch("/api/menu"), fetch("/api/tables")]);
      if (!menuRes.ok || !tableRes.ok) {
        throw new Error("Tidak dapat mengambil data dari server.");
      }
      const menuJson = (await menuRes.json()) as { items: MenuItem[] };
      const tableJson = (await tableRes.json()) as { tables: CafeTable[] };
      setMenuItems(menuJson.items);
      setTables(tableJson.tables);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Terjadi gangguan koneksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyOrders = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setMyOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders?ids=${encodeURIComponent(ids.join(","))}`);
      if (res.ok) {
        const data = (await res.json()) as { orders: Order[] };
        setMyOrders(data.orders);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const qrTable = params.get("table");
      let storedIds: string[] = [];
      try {
        const parsed = JSON.parse(localStorage.getItem(MY_ORDERS_KEY) ?? "[]") as string[];
        if (Array.isArray(parsed)) storedIds = parsed;
      } catch {
        // Ignore malformed localStorage state.
      }
      try {
        const [menuRes, tableRes] = await Promise.all([fetch("/api/menu"), fetch("/api/tables")]);
        if (!active) return;
        if (!menuRes.ok || !tableRes.ok) {
          throw new Error("Tidak dapat mengambil data dari server.");
        }
        const menuJson = (await menuRes.json()) as { items: MenuItem[] };
        const tableJson = (await tableRes.json()) as { tables: CafeTable[] };
        setMenuItems(menuJson.items);
        setTables(tableJson.tables);
        if (qrTable) {
          setOrderType("DINE_IN");
          setTableCode(qrTable.toUpperCase());
        }
        if (storedIds.length > 0) {
          setMyOrderIds(storedIds);
          const ordRes = await fetch(`/api/orders?ids=${encodeURIComponent(storedIds.join(","))}`);
          if (active && ordRes.ok) {
            const ordData = (await ordRes.json()) as { orders: Order[] };
            setMyOrders(ordData.orders);
          }
        }
      } catch (err) {
        if (active) {
          setLoadError(err instanceof Error ? err.message : "Terjadi gangguan koneksi.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (myOrderIds.length === 0) return;
    const timer = setInterval(() => {
      void fetchMyOrders(myOrderIds);
    }, 5000);
    return () => clearInterval(timer);
  }, [myOrderIds, fetchMyOrders]);

  useEffect(() => {
    if (!mobileCartOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileCartOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileCartOpen]);

  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of cart) {
      map[entry.key] = entry.quantity;
    }
    return map;
  }, [cart]);

  function handleAddToCart(selection: CartSelection) {
    setCart((prev) => mergeCartSelection(prev, selection));
    setSubmitError(null);
  }

  function handleUpdateQty(key: string, delta: number) {
    setCart((prev) => updateCartQuantity(prev, key, delta));
  }

  async function handleSubmitOrder() {
    if (cart.length === 0) return;
    if (orderType === "DINE_IN" && !tableCode) {
      setSubmitError("Pilih nomor meja terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "CUSTOMER",
          type: orderType,
          tableCode: orderType === "DINE_IN" ? tableCode : null,
          customerName,
          notes,
          paymentMethod,
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
        setSubmitError(data.error ?? "Pesanan gagal dikirim.");
        return;
      }

      const created = data.order;
      const nextIds = [created.id, ...myOrderIds].slice(0, 20);
      setMyOrderIds(nextIds);
      try {
        localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(nextIds));
      } catch {
        // Ignore storage quota errors.
      }
      setLastOrder(created);
      setCart([]);
      setNotes("");
      setMobileCartOpen(false);
      setTab("ORDERS");
      await Promise.all([fetchMyOrders(nextIds), loadCatalog()]);
    } catch {
      setSubmitError("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  const cartItemCount = cart.reduce((sum, e) => sum + e.quantity, 0);
  const cartTotal = cart.reduce((sum, e) => sum + e.unitPrice * e.quantity, 0);

  const cartElement = (
    <CartPanel
      mode="CUSTOMER"
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
      onUpdateQty={handleUpdateQty}
      onClearCart={() => setCart([])}
      onSubmit={() => void handleSubmitOrder()}
      submitting={submitting}
      submitError={submitError}
    />
  );

  return (
    <AppShell rightPanel={showWelcome || enteringMenu ? undefined : cartElement}>
      {enteringMenu ? (
        <div className="my-10">
          <CafeLoader label="Menyiapkan daftar menu segar Lizui Coffee..." />
        </div>
      ) : showWelcome ? (
        <section
          aria-label="Halaman pembuka Lizui Coffee"
          className="mx-auto my-2 flex min-h-[78vh] max-w-md flex-col justify-between overflow-hidden rounded-[28px] border border-[#2A2520] bg-[#0F130F] text-[#FFFFFF] shadow-xl sm:max-w-lg"
        >
          <div className="relative flex flex-1 flex-col justify-between p-6 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/welcome-hero.jpg"
              alt="Secangkir latte art Lizui Coffee di atas meja kayu"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E130F]/95 via-[#221A14]/65 to-[#0C100C]/90" />

            <div className="relative z-10 pt-4 text-center">
              {tableCode ? (
                <span className="mb-3 inline-flex items-center rounded-full border border-[#C9A37B]/40 bg-[#1B1612]/85 px-3.5 py-1 text-xs font-bold tracking-wide text-[#E7C6A1]">
                  QR Meja Terdeteksi • Meja {tableCode}
                </span>
              ) : (
                <span className="mb-3 inline-flex items-center rounded-full border border-[#C9A37B]/30 bg-[#1B1612]/80 px-3.5 py-1 text-xs font-semibold tracking-wide text-[#E7C6A1]">
                  Selamat Datang di Lizui Coffee
                </span>
              )}
              <h1 className="mx-auto max-w-xs text-3xl leading-tight font-bold tracking-tight text-[#FFFFFF] sm:max-w-sm sm:text-4xl">
                Coffee so good, your taste buds will love it
              </h1>
              <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-[#E3DBD3] sm:text-sm">
                The best grain, the finest roast, the most powerful flavor.
              </p>
            </div>

            <div className="relative z-10 mt-56 pt-6">
              <button
                type="button"
                disabled={enteringMenu}
                onClick={handleEnterMenu}
                className="min-h-[54px] w-full rounded-full bg-[#C9A37B] px-6 text-base font-bold text-[#FFFFFF] shadow-lg transition-all duration-200 hover:scale-[1.01] hover:bg-[#B89167] disabled:opacity-75"
              >
                {enteringMenu ? "Menyiapkan Menu..." : "Get Started"}
              </button>
            </div>
          </div>
        </section>
      ) : (
      <>
      <div className="animate-fade-up space-y-6 pb-24 xl:pb-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1F1B18]">
              Pesan Kopi &amp; Hidangan
            </h1>
            <p className="mt-1 text-sm text-[#5E5650]">
              Pilih menu favorit untuk makan di meja atau bawa pulang tanpa perlu login.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWelcome(true)}
              className="min-h-[44px] rounded-xl border border-[#DDD5CD] bg-[#FFFFFF] px-3 text-xs font-semibold text-[#5E5650] hover:text-[#1F1B18]"
            >
              Layar Pembuka
            </button>
            <div role="tablist" aria-label="Tampilan pelanggan" className="inline-flex rounded-xl bg-[#FFFFFF] p-1 border border-[#DDD5CD]">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "MENU"}
              onClick={() => setTab("MENU")}
              className={`min-h-[44px] rounded-[10px] px-4 text-sm font-semibold ${
                tab === "MENU" ? "bg-[#231F1D] text-[#FFFFFF]" : "text-[#5E5650] hover:text-[#1F1B18]"
              }`}
            >
              Daftar Menu
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "ORDERS"}
              onClick={() => {
                setTab("ORDERS");
                void fetchMyOrders(myOrderIds);
              }}
              className={`min-h-[44px] rounded-[10px] px-4 text-sm font-semibold ${
                tab === "ORDERS" ? "bg-[#231F1D] text-[#FFFFFF]" : "text-[#5E5650] hover:text-[#1F1B18]"
              }`}
            >
              Pesanan Saya ({myOrders.length})
            </button>
            </div>
          </div>
        </div>

        {lastOrder ? (
          <div
            role="status"
            className="flex flex-col justify-between gap-3 rounded-2xl border border-[#166534] bg-[#ECFDF3] p-4 sm:flex-row sm:items-center"
          >
            <div>
              <p className="text-sm font-bold text-[#166534]">
                Pesanan {lastOrder.orderNumber} berhasil dikirim ({lastOrder.type === "DINE_IN" ? `Meja ${lastOrder.tableCode}` : "Bawa Pulang"})
              </p>
              <p className="mt-0.5 text-xs text-[#166534]">
                Total {formatRupiah(lastOrder.total)} via {lastOrder.paymentMethod}. Silakan konfirmasi pembayaran di kasir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastOrder(null)}
              className="min-h-[40px] shrink-0 rounded-[10px] border border-[#166534] bg-[#FFFFFF] px-3 text-xs font-semibold text-[#166534]"
            >
              Tutup Info
            </button>
          </div>
        ) : null}

        {tab === "MENU" ? (
          <MenuBrowser
            items={menuItems}
            loading={loading}
            error={loadError}
            onRetry={() => void loadCatalog()}
            onAdd={handleAddToCart}
            cartQuantities={cartQuantities}
          />
        ) : (
          <section aria-label="Status pesanan saya" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1F1B18]">Riwayat &amp; Status Pesanan Anda</h2>
              <button
                type="button"
                onClick={() => void fetchMyOrders(myOrderIds)}
                className="min-h-[44px] rounded-[10px] border border-[#DDD5CD] bg-[#FFFFFF] px-4 text-xs font-semibold text-[#1F1B18] hover:bg-[#F3EEE9]"
              >
                Perbarui Status
              </button>
            </div>

            {ordersLoading && myOrders.length === 0 ? (
              <CafeLoader label="Memuat status pesanan Anda..." />
            ) : myOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-8 text-center">
                <p className="text-base font-bold text-[#1F1B18]">Belum ada pesanan di perangkat ini</p>
                <p className="mt-1 text-sm text-[#5E5650]">
                  Pilih kopi atau makanan dari tab Daftar Menu untuk memesan.
                </p>
                <button
                  type="button"
                  onClick={() => setTab("MENU")}
                  className="mt-4 min-h-[44px] rounded-[10px] bg-[#B8551E] px-5 text-sm font-semibold text-[#FFFFFF]"
                >
                  Lihat Menu
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-[#1F1B18] tabular-nums">
                          {order.orderNumber}
                        </span>
                        <span className="ml-2 text-xs text-[#5E5650]">
                          {order.type === "DINE_IN" ? `Meja ${order.tableCode}` : "Bawa Pulang"} •{" "}
                          {formatDateTimeShort(order.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            order.paymentStatus === "PAID"
                              ? "bg-[#ECFDF3] text-[#166534]"
                              : "bg-[#FFF1EB] text-[#B93815]"
                          }`}
                        >
                          {order.paymentStatus === "PAID" ? "Lunas" : `Belum Bayar (${order.paymentMethod})`}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1 border-t border-[#F0EAE3] pt-3 text-sm text-[#1F1B18]">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>
                            {item.itemName} ({item.variantLabel}) x{item.quantity}
                          </span>
                          <span className="font-semibold tabular-nums">{formatRupiah(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 flex items-center justify-between border-t border-[#F0EAE3] pt-2.5 text-sm font-bold">
                      <span>Total</span>
                      <span className="text-[#B8551E] tabular-nums">{formatRupiah(order.total)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#DDD5CD] bg-[#FFFFFF] px-4 py-3 xl:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#5E5650]">
              {cartItemCount > 0 ? `${cartItemCount} item dipilih` : "Keranjang masih kosong"}
            </p>
            <p className="text-base font-bold text-[#1F1B18] tabular-nums">{formatRupiah(cartTotal)}</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="min-h-[44px] rounded-[10px] bg-[#B8551E] px-5 text-sm font-bold text-[#FFFFFF]"
          >
            Buka Keranjang ({cartItemCount})
          </button>
        </div>
      </div>

      {mobileCartOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keranjang belanja"
          className="fixed inset-0 z-40 flex items-end bg-black/40 xl:hidden"
        >
          <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-[#FFFFFF]">
            <div className="flex items-center justify-between border-b border-[#DDD5CD] px-5 py-3">
              <span className="text-sm font-bold text-[#1F1B18]">Detail Pesanan</span>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="min-h-[44px] rounded-[10px] px-3 text-sm font-semibold text-[#1F1B18] hover:bg-[#F3EEE9]"
              >
                Tutup
              </button>
            </div>
            {cartElement}
          </div>
        </div>
      ) : null}
      </>
      )}
    </AppShell>
  );
}
