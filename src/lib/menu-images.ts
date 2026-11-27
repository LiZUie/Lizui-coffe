import type { DrinkTemperature } from "./types";

export interface MenuImagePreset {
  key: string;
  label: string;
}

export const MENU_IMAGE_PRESETS: MenuImagePreset[] = [
  { key: "iced-latte", label: "Cappucino" },
  { key: "coffee-latte", label: "Coffee Latte" },
  { key: "americano", label: "Americano" },
  { key: "v60", label: "Black Tea" },
  { key: "matcha", label: "Matcha" },
  { key: "chocolate", label: "Dark Chocolate" },
  { key: "rice-bowl", label: "Rice Bowl" },
  { key: "pasta", label: "Pasta" },
  { key: "fries", label: "Snack" },
  { key: "croissant", label: "Croissant" },
  { key: "cake", label: "Cake" },
];

const PRESET_SET = new Set(MENU_IMAGE_PRESETS.map((p) => p.key));
const HOT_COFFEE_KEYS = new Set(["iced-latte", "coffee-latte", "americano", "v60", "chocolate"]);
const UPLOADED_PATH_RE = /^\/api\/menu\/image\/[a-f0-9-]+\.(jpg|png|webp)$/;

export function isPresetMenuKey(value: string): boolean {
  return PRESET_SET.has(value);
}

export function isSafeUploadedMenuPath(value: string): boolean {
  return UPLOADED_PATH_RE.test(value);
}

export function resolveMenuImageSrc(visualKey: string, temperature?: DrinkTemperature): string {
  if (isSafeUploadedMenuPath(visualKey)) return visualKey;
  if (temperature === "Panas" && HOT_COFFEE_KEYS.has(visualKey)) {
    return `/images/menu/${visualKey}-hot.jpg`;
  }
  if (isPresetMenuKey(visualKey)) return `/images/menu/${visualKey}.jpg`;
  return temperature === "Panas" ? "/images/menu/iced-latte-hot.jpg" : "/images/menu/iced-latte.jpg";
}

export function detectImageExtension(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}
