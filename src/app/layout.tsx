import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Purr'Coffee | Pemesanan Meja, Kasir POS, & Monitoring Kafe",
  description: "Sistem pemesanan pelanggan meja dan bawa pulang, kasir outlet, serta dashboard monitoring kafe.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={plusJakarta.className}>{children}</body>
    </html>
  );
}
