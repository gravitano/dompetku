# Tasks — E02-US03 Daftar transaksi dengan filter

- [x] Follow-up: toggle jenis di form nonaktif saat menyimpan
- [x] Follow-up: fixture E2E `x-forwarded-for` acak per test (browser context) untuk limiter production
- [x] Kontrak URL: parse/validasi search params, `transactionListHref`, normalisasi kategori milik user
- [x] Query: where builder, ringkasan periode terfilter, halaman cursor (50) + total harian, detail transaksi
- [x] Kategori filter (termasuk terarsip) + key unik untuk `data-testid`
- [x] Pengelompokan per tanggal + label "Rabu, 30 Sep 2026"
- [x] Server Action halaman berikutnya
- [x] UI: navigasi bulan, panel filter (sheet/panel), chip + reset, ringkasan, daftar per tanggal, infinite scroll,
      skeleton, empty state, error + Coba lagi
- [x] Route: `/transactions` (searchParams), `error.tsx`, detail read-only `/transactions/[id]` + not found
- [x] Unit test (Vitest)
- [x] E2E Playwright semua skenario US03 + smoke (HP & desktop)
- [x] Verifikasi: lint, format, unit, build, seluruh E2E + smoke dengan `next dev` dan `next start`

Hasil verifikasi: lint + typecheck, format, Vitest 279/279, `next build`, seluruh Playwright (termasuk smoke)
212/212 terhadap `next dev` dan 212/212 terhadap `next start`.
