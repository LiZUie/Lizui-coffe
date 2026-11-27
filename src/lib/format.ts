import type { MenuCategory, OrderStatus } from "./types";

export function formatRupiah(amount: number): string {
  const n = Math.round(amount);
  const abs = Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return n < 0 ? `-Rp ${abs}` : `Rp ${abs}`;
}

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  COFFEE: "Coffee",
  NON_COFFEE: "Non Coffee",
  FOOD: "Food",
  SNACK: "Snack",
  DESSERT: "Dessert",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Menunggu",
  PREPARING: "Dibuat",
  READY: "Siap",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export function formatTimeShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
