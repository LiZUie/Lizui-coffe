"use client";

import React, { useMemo, useState } from "react";
import {
  buildCartKey,
  COFFEE_TEMPERATURES,
  computeConfiguredUnitPrice,
  getSugarExtraPrice,
  isCoffeeCategory,
  isDrinkCategory,
  type SharedCartSelection,
  SUGAR_LEVELS,
} from "@/lib/drink-options";
import { CATEGORY_LABELS, formatRupiah } from "@/lib/format";
import type { DrinkTemperature, MenuCategory, MenuItem, SugarLevel } from "@/lib/types";
import { MenuVisual } from "./MenuVisual";

export type CartSelection = SharedCartSelection;

interface MenuBrowserProps {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAdd: (selection: CartSelection) => void;
  cartQuantities?: Record<string, number>;
}

const CATEGORIES: Array<"ALL" | MenuCategory> = [
  "ALL",
  "COFFEE",
  "NON_COFFEE",
  "FOOD",
  "SNACK",
  "DESSERT",
];

export function MenuBrowser({
  items,
  loading,
  error,
  onRetry,
  onAdd,
  cartQuantities = {},
}: MenuBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"ALL" | MenuCategory>("ALL");
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [selectedTemp, setSelectedTemp] = useState<Record<string, DrinkTemperature>>({});
  const [selectedSugar, setSelectedSugar] = useState<Record<string, SugarLevel>>({});
  const [cardQty, setCardQty] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (activeCategory !== "ALL" && item.category !== activeCategory) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    });
  }, [items, query, activeCategory]);

  return (
    <section aria-label="Daftar menu kafe" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor="menu-search" className="sr-only">
            Cari menu kopi atau makanan
          </label>
          <input
            id="menu-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari menu kopi, matcha, makanan..."
            className="min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FFFFFF] px-4 text-sm text-[#1F1B18] placeholder:text-[#5E5650]"
          />
        </div>
      </div>

      <div role="tablist" aria-label="Kategori menu" className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          const label = cat === "ALL" ? "Semua Menu" : CATEGORY_LABELS[cat];
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(cat)}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors ${
                active
                  ? "border-[#B8551E] bg-[#B8551E] text-[#FFFFFF]"
                  : "border-[#DDD5CD] bg-[#FFFFFF] text-[#1F1B18] hover:bg-[#F3EEE9]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-8 text-center text-sm text-[#5E5650]">
          Memuat daftar menu kafe...
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-[#B93815] bg-[#FFF1EB] p-6 text-sm text-[#B93815]">
          <p className="font-semibold">Gagal memuat daftar menu: {error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 min-h-[44px] rounded-[10px] bg-[#B8551E] px-4 font-semibold text-[#FFFFFF]"
          >
            Muat Ulang
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-8 text-center">
          <p className="text-base font-bold text-[#1F1B18]">Menu tidak ditemukan</p>
          <p className="mt-1 text-sm text-[#5E5650]">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
          {query || activeCategory !== "ALL" ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveCategory("ALL");
              }}
              className="mt-4 min-h-[44px] rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-4 text-sm font-semibold text-[#1F1B18]"
            >
              Tampilkan Semua Menu
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const isDrink = isDrinkCategory(item.category);
            const isCoffee = isCoffeeCategory(item.category);
            const currentVariantLabel = selectedVariant[item.id] ?? item.variants[0]?.label ?? "Regular";
            const currentTemp: DrinkTemperature | undefined = isCoffee
              ? selectedTemp[item.id] ?? "Ice"
              : undefined;
            const currentSugar: SugarLevel | undefined = isDrink
              ? selectedSugar[item.id] ?? "Normal"
              : undefined;

            const configured = computeConfiguredUnitPrice(item, {
              variantLabel: currentVariantLabel,
              temperature: currentTemp,
              sugarLevel: currentSugar,
            });
            const qty = cardQty[item.id] ?? 1;
            const cartKey = buildCartKey(item.id, configured.variantLabel, currentTemp, currentSugar);
            const inCartQty = cartQuantities[cartKey] ?? 0;
            const sizeScale = isDrink
              ? configured.variantLabel.toLowerCase().includes("large")
                ? "large"
                : configured.variantLabel.toLowerCase().includes("small")
                  ? "small"
                  : "normal"
              : "normal";

            return (
              <article
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border bg-[#FFFFFF] p-4 transition-colors ${
                  item.isAvailable ? "border-[#DDD5CD]" : "border-[#E8CFC4] bg-[#FDF9F7]"
                }`}
              >
                <div className="flex gap-3.5">
                  <MenuVisual
                    visualKey={item.visualKey}
                    temperature={currentTemp}
                    sizeScale={sizeScale}
                    size={88}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-[#1F1B18]">{item.name}</h3>
                      <span className="shrink-0 text-sm font-bold text-[#B8551E] tabular-nums">
                        {formatRupiah(configured.unitPrice)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5E5650]">
                      {item.description}
                    </p>

                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.variants.map((variant) => {
                          const isPicked = variant.label === configured.variantLabel;
                          return (
                            <button
                              key={variant.label}
                              type="button"
                              disabled={!item.isAvailable}
                              onClick={() =>
                                setSelectedVariant((prev) => ({ ...prev, [item.id]: variant.label }))
                              }
                              className={`min-h-[34px] rounded-full border px-3 text-xs font-semibold transition-colors ${
                                isPicked
                                  ? "border-[#231F1D] bg-[#231F1D] text-[#FFFFFF]"
                                  : "border-[#DDD5CD] bg-[#FAF7F4] text-[#1F1B18] hover:bg-[#F3EEE9]"
                              }`}
                            >
                              {variant.label}
                              {variant.priceDelta > 0 ? ` (+${Math.round(variant.priceDelta / 1000)}rb)` : ""}
                            </button>
                          );
                        })}
                      </div>

                      {isCoffee ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-0.5 text-[11px] font-semibold text-[#5E5650]">Sajian:</span>
                          {COFFEE_TEMPERATURES.map((temp) => {
                            const isPicked = currentTemp === temp;
                            return (
                              <button
                                key={temp}
                                type="button"
                                disabled={!item.isAvailable}
                                onClick={() => setSelectedTemp((prev) => ({ ...prev, [item.id]: temp }))}
                                className={`min-h-[32px] rounded-full border px-2.5 text-xs font-semibold transition-colors ${
                                  isPicked
                                    ? "border-[#231F1D] bg-[#231F1D] text-[#FFFFFF]"
                                    : "border-[#DDD5CD] bg-[#FAF7F4] text-[#1F1B18] hover:bg-[#F3EEE9]"
                                }`}
                              >
                                {temp}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {isDrink ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mr-0.5 text-[11px] font-semibold text-[#5E5650]">Gula:</span>
                          {SUGAR_LEVELS.map((sugar) => {
                            const isPicked = currentSugar === sugar;
                            const extra = getSugarExtraPrice(item, sugar);
                            return (
                              <button
                                key={sugar}
                                type="button"
                                disabled={!item.isAvailable}
                                onClick={() => setSelectedSugar((prev) => ({ ...prev, [item.id]: sugar }))}
                                className={`min-h-[32px] rounded-full border px-2.5 text-xs font-semibold transition-colors ${
                                  isPicked
                                    ? "border-[#B8551E] bg-[#F3B68D] text-[#1F1B18]"
                                    : "border-[#DDD5CD] bg-[#FAF7F4] text-[#1F1B18] hover:bg-[#F3EEE9]"
                                }`}
                              >
                                {sugar}
                                {extra > 0 ? ` (+${Math.round(extra / 1000)}rb)` : ""}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EAE3] pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!item.isAvailable || qty <= 1}
                      aria-label={`Kurangi jumlah ${item.name}`}
                      onClick={() =>
                        setCardQty((prev) => ({ ...prev, [item.id]: Math.max(1, (prev[item.id] ?? 1) - 1) }))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] text-base font-bold text-[#1F1B18] hover:bg-[#F3EEE9] disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-7 text-center text-sm font-bold text-[#1F1B18] tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={!item.isAvailable}
                      aria-label={`Tambah jumlah ${item.name}`}
                      onClick={() =>
                        setCardQty((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 1) + 1 }))
                      }
                      className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] text-base font-bold text-[#1F1B18] hover:bg-[#F3EEE9] disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  {item.isAvailable ? (
                    <button
                      type="button"
                      onClick={() => {
                        onAdd({
                          menuItem: item,
                          variantLabel: configured.variantLabel,
                          temperature: configured.temperature,
                          sugarLevel: configured.sugarLevel,
                          unitPrice: configured.unitPrice,
                          displayVariant: configured.displayVariant,
                          quantity: qty,
                        });
                        setCardQty((prev) => ({ ...prev, [item.id]: 1 }));
                      }}
                      className={`min-h-[44px] flex-1 rounded-[10px] px-3 py-2 text-xs font-bold sm:text-sm transition-colors ${
                        inCartQty > 0
                          ? "bg-[#F3B68D] text-[#1F1B18] hover:bg-[#EAA476]"
                          : "bg-[#B8551E] text-[#FFFFFF] hover:bg-[#9E4616]"
                      }`}
                    >
                      {inCartQty > 0 ? `Tambah Lagi (${inCartQty})` : "Tambah ke Keranjang"}
                    </button>
                  ) : (
                    <span className="inline-flex min-h-[44px] items-center rounded-[10px] bg-[#FFF1EB] px-4 text-xs font-bold text-[#B93815]">
                      Stok Habis
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
