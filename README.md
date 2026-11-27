# Lizui Coffee (`kafe v1`)

Sistem pemesanan kafe terintegrasi dalam satu aplikasi **Next.js (App Router, TypeScript, Tailwind CSS)** dengan database lokal **SQLite (`node:sqlite`)**.

## Fitur Utama

1. **Pemesanan Pelanggan (`/`)** — Tanpa login:
   - Katalog menu kopi, non-kopi, makanan, camilan, dan dessert dengan pilihan varian/ukuran.
   - Mode **Pesan Meja (Dine-in)** (mendukung parameter QR meja `/?table=M03`) dan **Bawa Pulang (Take away)**.
   - Pembayaran simulasi **QRIS** atau **Tunai di Kasir**, serta tab **Pesanan Saya** untuk memantau status pesanan.
2. **Kasir POS Outlet (`/kasir`)** — PIN demo: `1234`:
   - Input order langsung di konter (Meja / Bawa Pulang) dengan kalkulator kembalian tunai dan diskon.
   - Antrean pesanan masuk (gabungan order pelanggan & kasir), konfirmasi pembayaran, ubah status (`Dibuat` -> `Siap` -> `Selesai`), dan cetak struk 1 halaman.
   - Manajemen meja (`M01`–`M10`) dan toggle cepat ketersediaan menu (`Tersedia` / `Habis`).
3. **Dashboard Monitoring Manajer (`/manager`)** — PIN demo: `9999`:
   - Filter periode `Hari Ini`, `7 Hari`, `30 Hari`.
   - Ringkasan KPI, grafik perkembangan penjualan, komposisi `Dine-in` vs `Take away`, dan peringkat menu paling sering dibeli.
   - **Export Laporan CSV** (siap buka di Excel) dan **Cetak / PDF**, serta kelola katalog menu.

## Menjalankan Secara Lokal

Prasyarat: **Node.js >= 22.5** (sudah menyertakan `node:sqlite`).

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Pengujian & Build

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```
