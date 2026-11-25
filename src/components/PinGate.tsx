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

export function PinGate({ requiredRole, title, subtitle, demoPin, onSuccess }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitPin(targetPin: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: requiredRole, pin: targetPin }),
      });
      const data = (await res.json()) as { role?: StaffRole; error?: string };
      if (!res.ok || !data.role) {
        setError(data.error ?? "PIN tidak cocok.");
        return;
      }
      onSuccess(data.role);
    } catch {
      setError("Koneksi gagal saat memeriksa PIN.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto my-8 max-w-md rounded-2xl border border-[#DDD5CD] bg-[#FFFFFF] p-6 sm:p-8">
      <h1 className="text-xl font-bold text-[#1F1B18]">{title}</h1>
      <p className="mt-1.5 text-sm text-[#5E5650]">{subtitle}</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submitPin(pin);
        }}
      >
        <div>
          <label htmlFor="staff-pin" className="block text-sm font-semibold text-[#1F1B18]">
            PIN Akses {requiredRole === "MANAGER" ? "Manajer" : "Kasir"}
          </label>
          <input
            id="staff-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Masukkan 4 digit PIN"
            className="mt-1.5 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#FAF7F4] px-3.5 text-base font-semibold tracking-widest text-[#1F1B18]"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-[10px] bg-[#FFF1EB] px-3 py-2 text-sm font-medium text-[#B93815]">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !pin.trim()}
          className="min-h-[44px] w-full rounded-[10px] bg-[#B8551E] px-4 text-sm font-semibold text-[#FFFFFF] hover:bg-[#9E4616] disabled:opacity-50"
        >
          {submitting ? "Memeriksa PIN..." : "Masuk"}
        </button>
      </form>

      <div className="mt-5 border-t border-[#DDD5CD] pt-4">
        <p className="text-xs text-[#5E5650]">
          Mode demo aktif. PIN standar:{" "}
          <span className="font-bold text-[#1F1B18] tabular-nums">{demoPin}</span>
        </p>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            setPin(demoPin);
            void submitPin(demoPin);
          }}
          className="mt-2.5 min-h-[44px] w-full rounded-[10px] border border-[#DDD5CD] bg-[#F3EEE9] px-4 text-sm font-semibold text-[#1F1B18] hover:bg-[#EAE1D8]"
        >
          Masuk Cepat dengan PIN Demo ({demoPin})
        </button>
      </div>
    </div>
  );
}
