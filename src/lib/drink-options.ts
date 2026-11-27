import type { DrinkTemperature, MenuCategory, MenuItem, SugarLevel } from "./types";

export const EXTRA_SUGAR_PRICE = 2000;
export const SUGAR_LEVELS: SugarLevel[] = ["Dikit", "Normal", "Banyak"];
export const COFFEE_TEMPERATURES: DrinkTemperature[] = ["Panas", "Ice"];

export function isDrinkCategory(category: MenuCategory): boolean {
  return category === "COFFEE" || category === "NON_COFFEE";
}

export function isCoffeeCategory(category: MenuCategory): boolean {
  return category === "COFFEE";
}

export function isTeaMenu(name: string): boolean {
  return /\b(teh|tea)\b/i.test(name);
}

export function hasTemperatureOption(
  menu: Pick<MenuItem, "category" | "name"> & { visualKey?: string },
): boolean {
  if (isCoffeeCategory(menu.category)) return true;
  if (isTeaMenu(menu.name)) return true;
  if (/\b(chocolate|cokelat)\b/i.test(menu.name)) return true;
  return menu.visualKey === "v60" || menu.visualKey === "chocolate";
}

export function getSugarExtraPrice(menu: Pick<MenuItem, "category" | "name">, sugarLevel: SugarLevel): number {
  if (!isDrinkCategory(menu.category)) return 0;
  if (sugarLevel !== "Banyak") return 0;
  return isTeaMenu(menu.name) ? 0 : EXTRA_SUGAR_PRICE;
}

export function buildCartKey(
  menuItemId: string,
  variantLabel: string,
  temperature?: DrinkTemperature,
  sugarLevel?: SugarLevel,
): string {
  return `${menuItemId}::${variantLabel}::${temperature ?? ""}::${sugarLevel ?? ""}`;
}

export function computeConfiguredUnitPrice(
  menu: MenuItem,
  opts: {
    variantLabel: string;
    temperature?: DrinkTemperature;
    sugarLevel?: SugarLevel;
  },
): {
  variantLabel: string;
  temperature?: DrinkTemperature;
  sugarLevel?: SugarLevel;
  unitPrice: number;
  displayVariant: string;
} {
  const variant = menu.variants.find((v) => v.label === opts.variantLabel) ?? menu.variants[0];
  const baseLabel = variant?.label ?? "Regular";
  let unitPrice = menu.price + (variant?.priceDelta ?? 0);

  if (!isDrinkCategory(menu.category)) {
    return {
      variantLabel: baseLabel,
      unitPrice,
      displayVariant: baseLabel,
    };
  }

  const sugarLevel: SugarLevel =
    opts.sugarLevel && SUGAR_LEVELS.includes(opts.sugarLevel) ? opts.sugarLevel : "Normal";
  unitPrice += getSugarExtraPrice(menu, sugarLevel);

  const temperature: DrinkTemperature | undefined = isCoffeeCategory(menu.category)
    ? opts.temperature === "Panas"
      ? "Panas"
      : "Ice"
    : hasTemperatureOption(menu) && (opts.temperature === "Panas" || opts.temperature === "Ice")
      ? opts.temperature
      : undefined;

  const parts = [baseLabel];
  if (temperature) parts.push(temperature);
  parts.push(`Gula ${sugarLevel}`);

  return {
    variantLabel: baseLabel,
    temperature,
    sugarLevel,
    unitPrice,
    displayVariant: parts.join(" • "),
  };
}

export interface SharedCartEntry {
  key: string;
  menuItemId: string;
  itemName: string;
  visualKey: string;
  variantLabel: string;
  baseVariantLabel: string;
  temperature?: DrinkTemperature;
  sugarLevel?: SugarLevel;
  unitPrice: number;
  quantity: number;
}

export interface SharedCartSelection {
  menuItem: MenuItem;
  variantLabel: string;
  temperature?: DrinkTemperature;
  sugarLevel?: SugarLevel;
  unitPrice: number;
  displayVariant: string;
  quantity: number;
}

export function mergeCartSelection(prev: SharedCartEntry[], selection: SharedCartSelection): SharedCartEntry[] {
  const key = buildCartKey(
    selection.menuItem.id,
    selection.variantLabel,
    selection.temperature,
    selection.sugarLevel,
  );
  const existing = prev.find((e) => e.key === key);
  if (existing) {
    return prev.map((e) => (e.key === key ? { ...e, quantity: e.quantity + selection.quantity } : e));
  }
  return [
    ...prev,
    {
      key,
      menuItemId: selection.menuItem.id,
      itemName: selection.menuItem.name,
      visualKey: selection.menuItem.visualKey,
      variantLabel: selection.displayVariant,
      baseVariantLabel: selection.variantLabel,
      temperature: selection.temperature,
      sugarLevel: selection.sugarLevel,
      unitPrice: selection.unitPrice,
      quantity: selection.quantity,
    },
  ];
}

export function updateCartQuantity(prev: SharedCartEntry[], key: string, delta: number): SharedCartEntry[] {
  return prev
    .map((e) => (e.key === key ? { ...e, quantity: e.quantity + delta } : e))
    .filter((e) => e.quantity > 0);
}
