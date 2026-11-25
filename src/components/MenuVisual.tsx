import React from "react";
import { resolveMenuImageSrc } from "@/lib/menu-images";

interface MenuVisualProps {
  visualKey: string;
  alt?: string;
  size?: number;
}

export function MenuVisual({ visualKey, alt = "", size = 80 }: MenuVisualProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolveMenuImageSrc(visualKey)}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-xl border border-[#EFEAE4] bg-[#F5F2EE] object-cover"
      style={{ width: size, height: size }}
    />
  );
}
