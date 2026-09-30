# Tasks — E02-US03 Daftar transaksi dengan filter

- [ ] Follow-up: toggle jenis di form nonaktif saat menyimpan
- [ ] Follow-up: fixture E2E `x-forwarded-for` acak per test (browser context) untuk limiter production
- [ ] Kontrak URL: parse/validasi search params, `transactionListHref`, normalisasi kategori milik user
- [ ] Query: where builder, ringkasan periode terfilter, halaman cursor (50) + total harian, detail transaksi
- [ ] Kategori filter (termasuk terarsip) + key unik untuk `data-testid`
- [ ] Pengelompokan per tanggal + label "Rabu, 30 Sep 2026"
- [ ] Server Action halaman berikutnya
- [ ] UI: navigasi bulan, panel filter (sheet/panel), chip + reset, ringkasan, daftar per tanggal, infinite scroll,
      skeleton, empty state, error + Coba lagi
- [ ] Route: `/transactions` (searchParams), `error.tsx`, detail read-only `/transactions/[id]` + not found
- [ ] Unit test (Vitest)
- [ ] E2E Playwright semua skenario US03 + smoke (HP & desktop)
- [ ] Verifikasi: lint, format, unit, build, seluruh E2E + smoke dengan `next dev` dan `next start`
