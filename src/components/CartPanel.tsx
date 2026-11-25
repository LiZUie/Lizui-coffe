"use client";

import React from "react";
import type { SharedCartEntry } from "@/lib/drink-options";
import { formatRupiah } from "@/lib/format";
import type { CafeTable, OrderType, PaymentMethod } from "@/lib/types";
import { MenuVisual } from "./MenuVisual";

export type CartEntry = SharedCartEntry;

interface CartPanelProps {
  mode: "CUSTOMER" | "CASHIER";
  entries: CartEntry[];
  tables: CafeTable[];
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  tableCode: string;
  onTableCodeChange: (code: string) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  discount?: number;
  onDiscountChange?: (value: number) => void;
  cashReceived?: number;
  onCashReceivedChange?: (value: number) => void;
  onUpdateQty: (key: string, delta: number) => void;
  onClearCart: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}

export function CartPanel({
  mode,
  entries,
  tables,
  orderType,
  onOrderTypeChange,
  tableCode,
  onTableCodeChange,
  customerName,
  onCustomerNameChange,
  notes,
  onNotesChange,
  paymentMethod,
  onPaymentMethodChange,
  discount = 0,
  onDiscountChange,
  cashReceived = 0,
  onCashReceivedChange,
  onUpdateQty,
  onClearCart,
  onSubmit,
  submitting,
  submitError,
}: CartPanelProps) {
  const subtotal = entries.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0);
  const safeDiscount = mode === "CASHIER" ? Math.max(0, Math.min(subtotal, discount)) : 0;
  const total = subtotal - safeDiscount;
  const cashChange = paymentMethod === "CASH" && cashReceived >= total ? cashReceived - total : 0;

  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1F1B18]">
              {mode === "CASHIER" ? "Pesanan Kasir" : "Keranjang Anda"}
            </h2>
            <p className="text-xs text-[#5E5650]">
              {mode === "CASHIER"
                ? "Input order langsung di konter atau bawa pulang"
                : "Pilih makan di meja atau bawa pulang"}
            </p>
          </div>
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={onClearCart}
              className="min-h-[36px] rounded-[10px] px-2.5 text-xs font-semibold text-[#B93815] hover:bg-[#FFF1EB]"
            >
              Kosongkan
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F3EEE9] p-1">
          <button
            type="button"
            onClick={() => onOrderTypeChange("DINE_IN")}
            className={`min-h-[44px] rounded-[10px] text-sm font-semibold transition-colors ${
              orderType === "DINE_IN"
                ? "bg-[#231F1D] text-[#FFFFFF]"
                : "text-[#5E5650] hover:text-[#1F1B18]"
            }`}
          >
            Pesan Meja
          </button>
          <button
            type="button"
            onClick={() => onOrderTypeChange("TAKE_AWAY")}
            className={`min-h-[44px] rounded-[10px] text-sm font-semibold transition-colors ${
              orderType === "TAKE_AWAY"
                ? "bg-[#231F1D] text-[#FFFFFF]"
                : "text-[#5E5650] hover:text-[#1F1B18]"
            }`}
          >
            Bawa Pulang
          </button>
        </div>

        {orderType === "DINE_IN" ? (
          <div>
            <label htmlFor={`table-select-${mode}`} className="block text-xs font-semibold text-[#1F1B18]">
              Nomor Meja
            </label>
            <select
              id={`table-select-${mode}`}
              value={tableCode}
              onChange={(e) => onTableCodeChange(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm font-semibold text-[#1F1B18]"
            >
              <option value="">-- Pilih meja --</option>
              {tables.map((t) => (
                <option key={t.id} value={t.code}>
                  {t.code} ({t.area})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
          <div>
            <label htmlFor={`cust-name-${mode}`} className="block text-xs font-semibold text-[#1F1B18]">
              Nama Pemesan
            </label>
            <input
              id={`cust-name-${mode}`}
              type="text"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder={orderType === "DINE_IN" ? "Misal: Raka (Meja M03)" : "Misal: Raka"}
              className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm text-[#1F1B18] placeholder:text-[#5E5650]"
            />
          </div>
          <div>
            <label htmlFor={`order-notes-${mode}`} className="block text-xs font-semibold text-[#1F1B18]">
              Catatan (Opsional)
            </label>
            <input
              id={`order-notes-${mode}`}
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Less sugar, sedikit es"
              className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm text-[#1F1B18] placeholder:text-[#5E5650]"
            />
          </div>
        </div>

        <div className="max-h-[260px] space-y-2.5 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DDD5CD] bg-[#FAF7F4] p-5 text-center text-xs text-[#5E5650]">
              Belum ada item dipilih. Pilih menu di sebelah kiri untuk mulai memesan.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center gap-3 rounded-xl border border-[#EFEAE4] bg-[#FAF7F4] p-2.5"
              >
                <MenuVisual visualKey={entry.visualKey} temperature={entry.temperature} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1F1B18]">{entry.itemName}</p>
                  <p className="text-xs text-[#5E5650]">
                    {entry.variantLabel} • {formatRupiah(entry.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Kurangi ${entry.itemName}`}
                    onClick={() => onUpdateQty(entry.key, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD5CD] bg-[#FFFFFF] text-sm font-bold text-[#1F1B18]"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-xs font-bold tabular-nums">{entry.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Tambah ${entry.itemName}`}
                    onClick={() => onUpdateQty(entry.key, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD5CD] bg-[#FFFFFF] text-sm font-bold text-[#1F1B18]"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3 border-t border-[#DDD5CD] pt-4">
        <div>
          <span className="block text-xs font-semibold text-[#1F1B18]">Metode Pembayaran</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPaymentMethodChange("QRIS")}
              className={`min-h-[44px] rounded-[10px] border text-xs font-semibold ${
                paymentMethod === "QRIS"
                  ? "border-[#231F1D] bg-[#231F1D] text-[#FFFFFF]"
                  : "border-[#DDD5CD] bg-[#FAF7F4] text-[#1F1B18]"
              }`}
            >
              QRIS
            </button>
            <button
              type="button"
              onClick={() => onPaymentMethodChange("CASH")}
              className={`min-h-[44px] rounded-[10px] border text-xs font-semibold ${
                paymentMethod === "CASH"
                  ? "border-[#231F1D] bg-[#231F1D] text-[#FFFFFF]"
                  : "border-[#DDD5CD] bg-[#FAF7F4] text-[#1F1B18]"
              }`}
            >
              Tunai {mode === "CUSTOMER" ? "(di Kasir)" : ""}
            </button>
          </div>
          {mode === "CUSTOMER" ? (
            <p className="mt-1.5 text-xs text-[#5E5650]">
              Pembayaran dikonfirmasi langsung oleh kasir setelah pesanan dibuat.
            </p>
          ) : null}
        </div>

        {mode === "CASHIER" && onDiscountChange ? (
          <div>
            <label htmlFor="cashier-discount" className="block text-xs font-semibold text-[#1F1B18]">
              Diskon (Rp)
            </label>
            <input
              id="cashier-discount"
              type="number"
              min={0}
              step={1000}
              value={discount || ""}
              onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
              placeholder="0"
              className="mt-1 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-sm tabular-nums text-[#1F1B18]"
            />
          </div>
        ) : null}

        {mode === "CASHIER" && paymentMethod === "CASH" && onCashReceivedChange ? (
          <div className="space-y-2 rounded-xl bg-[#FAF7F4] p-3">
            <label htmlFor="cash-received" className="block text-xs font-semibold text-[#1F1B18]">
              Uang Diterima (Rp)
            </label>
            <input
              id="cash-received"
              type="number"
              min={0}
              step={1000}
              value={cashReceived || ""}
              onChange={(e) => onCashReceivedChange(Number(e.target.value) || 0)}
              placeholder={String(total)}
              className="min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FFFFFF] px-3 text-sm font-bold tabular-nums text-[#1F1B18]"
            />
            <div className="flex flex-wrap gap-1.5">
              {[total, 50000, 100000].filter((v) => v > 0).map((preset, idx) => (
                <button
                  key={`${preset}-${idx}`}
                  type="button"
                  onClick={() => onCashReceivedChange(preset)}
                  className="min-h-[34px] rounded-lg border border-[#DDD5CD] bg-[#FFFFFF] px-2.5 text-xs font-semibold text-[#1F1B18] hover:bg-[#F3EEE9]"
                >
                  {idx === 0 ? "Uang Pas" : formatRupiah(preset)}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[#5E5650]">Kembalian</span>
              <span className="text-[#166534] tabular-nums">{formatRupiah(cashChange)}</span>
            </div>
          </div>
        ) : null}

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-[#5E5650]">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatRupiah(subtotal)}</span>
          </div>
          {safeDiscount > 0 ? (
            <div className="flex justify-between text-[#166534]">
              <span>Diskon</span>
              <span className="tabular-nums">-{formatRupiah(safeDiscount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between pt-1 text-base font-bold text-[#1F1B18]">
            <span>Total</span>
            <span className="tabular-nums">{formatRupiah(total)}</span>
          </div>
        </div>

        {submitError ? (
          <p role="alert" className="rounded-[10px] bg-[#FFF1EB] px-3 py-2 text-xs font-semibold text-[#B93815]">
            {submitError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={submitting || entries.length === 0}
          onClick={onSubmit}
          className="min-h-[48px] w-full rounded-[10px] bg-[#B8551E] px-4 text-sm font-bold text-[#FFFFFF] transition-colors hover:bg-[#9E4616] disabled:opacity-50"
        >
          {submitting
            ? "Memproses Pesanan..."
            : mode === "CASHIER"
              ? "Bayar & Proses Pesanan"
              : "Buat Pesanan Sekarang"}
        </button>
      </div>
    </div>
  );
}
