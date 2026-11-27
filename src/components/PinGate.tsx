"use client";

import React, { useState } from "react";
import type { StaffRole } from "@/lib/types";

interface PinGateProps {
  requiredRole: StaffRole;
  title: string;
  subtitle: string;
  demoPin: string;
  onSuccess: (role: StaffRole) => void;
}

export function PinGate({ requiredRole, title, subtitle, onSuccess }: PinGateProps) {
  const defaultDemoUser =
    requiredRole === "MANAGER" ? "admin@lizuicoffee.id" : "kasir@lizuicoffee.id";
  const defaultDemoPass = requiredRole === "MANAGER" ? "admin123" : "kasir123";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitCredentials(targetUser: string, targetPass: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: requiredRole,
          username: targetUser.trim(),
          password: targetPass,
        }),
      });
      const data = (await res.json()) as { role?: StaffRole; error?: string };
      if (!res.ok || !data.role) {
        setError(data.error ?? "Email/username atau password tidak cocok.");
        return;
      }
      onSuccess(data.role);
    } catch {
      setError("Koneksi gagal saat memeriksa akun staf.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#15110F] text-[#F5EFEA] lg:grid lg:min-h-screen lg:grid-cols-12">
      <div className="relative min-h-[260px] lg:col-span-5 lg:min-h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-beans.jpg"
          alt="Biji kopi sangrai Lizui Coffee"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0B09]/95 via-[#15110F]/35 to-[#15110F]/20" />

        <div className="relative flex h-full flex-col justify-end p-5 sm:p-7">
          <div className="rounded-2xl border border-[#342822] bg-[#17120F]/92 p-5">
            <p className="font-serif text-base leading-relaxed text-[#F5EFEA] sm:text-lg">
              &ldquo;The finest roast and seamless table hospitality — crafted fresh every morning at
              Lizui Coffee.&rdquo;
            </p>
            <p className="mt-2.5 text-xs font-semibold tracking-wider text-[#D98A4E] uppercase">
              Lizui Specialty Coffee • Internal Portal
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between bg-[#15110F] p-6 sm:p-10 lg:col-span-7 lg:p-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight text-[#FFFFFF]">
            Lizui<span className="text-[#DE8C52]">.</span>
          </span>
          <span className="rounded-full border border-[#312620] bg-[#1E1815] px-3 py-1 text-xs font-medium text-[#B8ABA1]">
            {requiredRole === "MANAGER" ? "Akses Admin / Manajemen" : "Akses Kasir (Dibuat oleh Admin)"}
          </span>
        </div>

        <div className="my-8 max-w-md">
          <p className="text-xs font-bold tracking-wider text-[#DE8C52] uppercase">{title}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#FFFFFF] sm:text-4xl">
            Sign In to Lizui.
          </h1>
          <p className="mt-2 text-sm text-[#A89B91]">{subtitle}</p>

          <form
            className="mt-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submitCredentials(username, password);
            }}
          >
            <div>
              <label
                htmlFor="staff-username"
                className="block text-[11px] font-bold tracking-wider text-[#B8ABA1] uppercase"
              >
                Email Address / Username
              </label>
              <input
                id="staff-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={defaultDemoUser}
                className="mt-1.5 min-h-[48px] w-full rounded-xl border border-[#312620] bg-[#211B18] px-4 text-sm text-[#F5EFEA] placeholder:text-[#786C63] focus:border-[#DE8C52] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="staff-password"
                className="block text-[11px] font-bold tracking-wider text-[#B8ABA1] uppercase"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-[48px] w-full rounded-xl border border-[#312620] bg-[#211B18] pr-12 pl-4 text-sm text-[#F5EFEA] placeholder:text-[#786C63] focus:border-[#DE8C52] focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-2 my-auto flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-[#B8ABA1] hover:text-[#FFFFFF]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#2C221E] bg-[#1C1613] px-3.5 py-2.5 text-xs text-[#A89B91]">
              Kasir dan Admin tidak dapat mendaftar akun sendiri. Penambahan akun kasir hanya dapat
              dilakukan oleh <strong className="text-[#F5EFEA]">Admin / Manajemen</strong>.
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-[#8E2F15] bg-[#2B140E] px-3.5 py-2.5 text-sm font-medium text-[#F9A086]"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="mt-2 min-h-[50px] w-full rounded-full bg-[#DE8C52] px-6 text-sm font-bold text-[#1A120E] transition-colors hover:bg-[#E79B64] disabled:opacity-50"
            >
              {submitting ? "Memverifikasi Akun..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-[#2A211D] pt-4">
            <p className="text-xs text-[#A89B91]">
              Akun demo bawaan:{" "}
              <span className="font-semibold text-[#F5EFEA]">{defaultDemoUser}</span> /{" "}
              <span className="font-semibold text-[#F5EFEA] tabular-nums">{defaultDemoPass}</span>
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setUsername(defaultDemoUser);
                setPassword(defaultDemoPass);
                void submitCredentials(defaultDemoUser, defaultDemoPass);
              }}
              className="mt-2.5 min-h-[44px] w-full rounded-xl border border-[#342923] bg-[#211B18] px-4 text-xs font-semibold text-[#F5EFEA] transition-colors hover:bg-[#2B231F]"
            >
              Masuk Cepat Akun Demo ({defaultDemoUser})
            </button>
          </div>
        </div>

        <p className="text-xs text-[#6E6259]">
          &copy; {new Date().getFullYear()} Lizui Specialty Coffee. All rights reserved.
        </p>
      </div>
    </div>
  );
}
