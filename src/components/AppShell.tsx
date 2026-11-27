"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface NavItem {
  href: string;
  label: string;
  badge?: number;
}

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

  const navItems: NavItem[] = [
    { href: "/", label: "Pesan Pelanggan" },
    { href: "/kasir", label: "Kasir POS", badge: activeQueueCount },
    { href: "/manager", label: "Dashboard Manajer" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F4] text-[#1F1B18]">
      <header className="no-print sticky top-0 z-30 border-b border-[#DDD5CD] bg-[#FFFFFF] lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-[#1F1B18]">
            Lizui <span className="text-[#B8551E]">Coffee</span>
          </Link>
          <div className="flex items-center gap-2">
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
        <nav aria-label="Navigasi utama" className="flex gap-2 overflow-x-auto px-4 pb-3">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-[10px] px-3.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#231F1D] text-[#FFFFFF]"
                    : "bg-[#F3EEE9] text-[#1F1B18] hover:bg-[#EAE1D8]"
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 ? (
                  <span className="rounded-full bg-[#F3B68D] px-2 py-0.5 text-xs font-bold text-[#1F1B18] tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="no-print hidden w-60 shrink-0 flex-col justify-between border-r border-[#DDD5CD] bg-[#FFFFFF] px-5 py-7 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div>
            <Link href="/" className="mb-8 block text-2xl font-bold tracking-tight text-[#1F1B18]">
              Lizui <span className="text-[#B8551E]">Coffee</span>
            </Link>

            <nav aria-label="Navigasi peran" className="space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-[44px] items-center justify-between rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-[#F3B68D] text-[#1F1B18]"
                        : "text-[#5E5650] hover:bg-[#F3EEE9] hover:text-[#1F1B18]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {typeof item.badge === "number" && item.badge > 0 ? (
                      <span className="rounded-full bg-[#231F1D] px-2 py-0.5 text-xs font-bold text-[#FFFFFF] tabular-nums">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3 border-t border-[#DDD5CD] pt-4">
            <div className="rounded-xl bg-[#FAF7F4] p-3 text-xs text-[#5E5650]">
              <p className="font-semibold text-[#1F1B18]">Outlet Utama</p>
              <p className="mt-1">10 meja aktif (M01 sampai M10)</p>
              <p className="mt-0.5">PIN Demo: Kasir 1234, Manajer 9999</p>
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
