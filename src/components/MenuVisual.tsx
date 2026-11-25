import React from "react";

interface MenuVisualProps {
  visualKey: string;
  alt?: string;
  size?: number;
}

const VALID_KEYS = new Set([
  "iced-latte",
  "coffee-latte",
  "americano",
  "v60",
  "matcha",
  "chocolate",
  "rice-bowl",
  "pasta",
  "fries",
  "croissant",
  "cake",
]);

export function MenuVisual({ visualKey, alt = "", size = 80 }: MenuVisualProps) {
  const safeKey = VALID_KEYS.has(visualKey) ? visualKey : "iced-latte";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/menu/${safeKey}.jpg`}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-xl border border-[#EFEAE4] bg-[#F5F2EE] object-cover"
      style={{ width: size, height: size }}
    />
  );
}
