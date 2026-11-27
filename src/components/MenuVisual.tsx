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
  const src = resolveMenuImageSrc(visualKey, temperature);
  const scaleClass =
    sizeScale === "small"
      ? "scale-[0.84]"
      : sizeScale === "large"
        ? "scale-[1.12]"
        : "scale-100";

  return (
    <div
      className="cafe-shimmer relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EFEAE4] bg-[#F5F2EE]"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`h-full w-full object-cover transition-transform duration-300 ease-out ${scaleClass}`}
      />
    </div>
  );
}

export function CafeLoader({ label = "Menyiapkan sajian Lizui Coffee..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] px-6 py-10 text-center"
    >
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FAF7F4] border border-[#EAE1D8]">
        <svg
          viewBox="0 0 48 48"
          className="h-10 w-10 text-[#B8551E]"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M17 13C17 10.5 19 9 19 6.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-steam-1"
          />
          <path
            d="M23 13C23 10.5 25 9 25 6.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-steam-2"
          />
          <path
            d="M29 13C29 10.5 31 9 31 6.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-steam-3"
          />
          <path
            d="M11 18H33V27C33 33.0751 28.0751 38 22 38C15.9249 38 11 33.0751 11 27V18Z"
            fill="#231F1D"
          />
          <path
            d="M33 20H36.5C38.9853 20 41 22.0147 41 24.5C41 26.9853 38.9853 29 36.5 29H33"
            stroke="#231F1D"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path d="M9 41H35" stroke="#B8551E" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </div>
      <p className="mt-3.5 text-sm font-bold text-[#1F1B18]">{label}</p>
      <p className="mt-1 text-xs text-[#5E5650]">Mohon tunggu sebentar...</p>
    </div>
  );
}
