"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface AppShellProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  activeQueueCount?: number;
  staffRoleLabel?: string | null;
  onLogoutStaff?: () => void;
}

export function AppShell({
  children,
  rightPanel,
  activeQueueCount,
  staffRoleLabel,
  onLogoutStaff,
}: AppShellProps) {
  const pathname = usePathname();

  const roleConfig = pathname.startsWith("/kasir")
    ? {
        href: "/kasir",
        label: "Kasir POS",
        badge: activeQueueCount,
        infoTitle: "Portal Kasir Outlet",
        infoLine1: "10 meja aktif (M01 sampai M10)",
        infoLine2: "Akses khusus transaksi & antrean kasir",
      }
    : pathname.startsWith("/manager")
      ? {
          href: "/manager",
          label: "Dashboard Manajer",
          badge: undefined,
          infoTitle: "Portal Admin & Manajemen",
          infoLine1: "Monitoring omzet & katalog menu",
          infoLine2: "Kelola akun kasir internal",
        }
      : {
          href: "/",
          label: "Pesan Pelanggan",
          badge: undefined,
          infoTitle: "Pemesanan Pelanggan",
          infoLine1: "Makan di meja (Dine-in) & Bawa Pulang",
          infoLine2: "Pilih menu & konfirmasi di kasir",
        };

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-[#1F1B18]">
      <header className="no-print sticky top-0 z-30 border-b border-[#DDD5CD] bg-[#FFFFFF] lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={roleConfig.href} className="text-lg font-bold tracking-tight text-[#1F1B18]">
            Lizui <span className="text-[#B8551E]">Coffee</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex min-h-[36px] items-center gap-2 rounded-[10px] bg-[#231F1D] px-3 text-xs font-semibold text-[#FFFFFF]">
              <span>{roleConfig.label}</span>
              {typeof roleConfig.badge === "number" && roleConfig.badge > 0 ? (
                <span className="rounded-full bg-[#F3B68D] px-2 py-0.5 text-xs font-bold text-[#1F1B18] tabular-nums">
                  {roleConfig.badge}
                </span>
              ) : null}
            </span>
            {staffRoleLabel && onLogoutStaff ? (
              <button
                type="button"
                onClick={onLogoutStaff}
                className="min-h-[44px] rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3 text-xs font-semibold text-[#1F1B18] hover:bg-[#F3EEE9]"
              >
                Keluar ({staffRoleLabel})
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="no-print hidden w-60 shrink-0 flex-col justify-between border-r border-[#DDD5CD] bg-[#FFFFFF] px-5 py-7 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div>
            <Link
              href={roleConfig.href}
              className="mb-8 block text-2xl font-bold tracking-tight text-[#1F1B18]"
            >
              Lizui <span className="text-[#B8551E]">Coffee</span>
            </Link>

            <nav aria-label="Area aktif" className="space-y-2">
              <div className="flex min-h-[44px] items-center justify-between rounded-[10px] bg-[#F3B68D] px-3.5 py-2.5 text-sm font-semibold text-[#1F1B18]">
                <span>{roleConfig.label}</span>
                {typeof roleConfig.badge === "number" && roleConfig.badge > 0 ? (
                  <span className="rounded-full bg-[#231F1D] px-2 py-0.5 text-xs font-bold text-[#FFFFFF] tabular-nums">
                    {roleConfig.badge}
                  </span>
                ) : null}
              </div>
            </nav>
          </div>

          <div className="space-y-3 border-t border-[#DDD5CD] pt-4">
            <div className="rounded-xl bg-[#FAF7F4] p-3 text-xs text-[#5E5650]">
              <p className="font-semibold text-[#1F1B18]">{roleConfig.infoTitle}</p>
              <p className="mt-1">{roleConfig.infoLine1}</p>
              <p className="mt-0.5">{roleConfig.infoLine2}</p>
            </div>
            {staffRoleLabel && onLogoutStaff ? (
              <button
                type="button"
                onClick={onLogoutStaff}
                className="min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FFFFFF] px-3 text-sm font-semibold text-[#1F1B18] hover:bg-[#F3EEE9]"
              >
                Keluar Sesi ({staffRoleLabel})
              </button>
            ) : null}
          </div>
        </aside>

        <main className="print-full min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>

        {rightPanel ? (
          <aside className="no-print hidden w-[360px] shrink-0 border-l border-[#DDD5CD] bg-[#FFFFFF] xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto">
            {rightPanel}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
