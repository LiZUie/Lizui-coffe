import React from "react";
import { resolveMenuImageSrc } from "@/lib/menu-images";
import type { DrinkTemperature } from "@/lib/types";

interface MenuVisualProps {
  visualKey: string;
  temperature?: DrinkTemperature;
  sizeScale?: "small" | "large" | "normal";
  alt?: string;
  size?: number;
}

export function MenuVisual({
  visualKey,
  temperature,
  sizeScale = "normal",
  alt = "",
  size = 80,
}: MenuVisualProps) {
  const scaleClass =
    sizeScale === "small" ? "scale-[0.86]" : sizeScale === "large" ? "scale-[1.07]" : "scale-100";

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EFEAE4] bg-[#F5F2EE]"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveMenuImageSrc(visualKey, temperature)}
        alt={alt}
        width={size}
        height={size}
        className={`h-full w-full object-cover transition-transform duration-150 ${scaleClass}`}
      />
    </div>
  );
}
