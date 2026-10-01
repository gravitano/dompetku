---
haie_story: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us03--grafik-tren-bulanan---story.md
status: implemented
branch: dev/e04-us03--grafik-tren-bulanan
---

# E04-US03 — Grafik tren 6 bulan (tab Laporan)

## Why

Grafik per kategori (E04-US02) hanya menunjukkan satu bulan. Tren pemasukan vs pengeluaran 6 bulan membantu pengguna
menilai apakah pengeluarannya makin terkendali (BO-03) dan memberi motivasi untuk terus mencatat (BO-01). FEAT-012,
Should Have. Acceptance criteria (story §3):

1. Bagian **"Tren 6 bulan"** di bawah tab Laporan: batang berpasangan pemasukan (hijau) & pengeluaran (merah) per bulan,
   6 bulan terakhir termasuk bulan berjalan.
2. Sumbu X nama bulan singkat ("Mei" … "Okt"); sumbu Y nominal singkat ("Rp 1,5 jt").
3. Tap (HP) / hover (desktop) batang bulan → tooltip nama bulan lengkap + pemasukan + pengeluaran (Rupiah lengkap).
4. Bulan tanpa transaksi tetap tampil dengan Rp 0.
5. **"Rata-rata pengeluaran per bulan"** di bawah grafik (Rupiah lengkap).
6. Legenda teks "Pemasukan" & "Pengeluaran" (tidak hanya warna).
7. Transaksi di < 2 bulan → grafik tetap tampil + "Tren akan lebih terlihat setelah ada data minimal 2 bulan".
8. Hanya transaksi milik pengguna login.

## What Changes

- **Tanggal** `~/lib/date`: `formatMonthShort` ("Okt") untuk sumbu X.
- **Logika murni** `src/modules/reports/trend.ts`: `trendMonthKeys(currentMonth)` (6 kunci "YYYY-MM", lintas tahun),
  `buildTrendReport(currentMonth, totals)` (isi 0 untuk bulan kosong, abaikan bulan di luar jendela, rata-rata,
  jumlah bulan berdata, flag data kurang), `TREND_MESSAGES`. Hasil hanya string/number (nominal string digit).
- **Query** `src/modules/reports/queries.ts`: `getMonthlyTotals(userId, from, to)` — SATU query agregasi
  (`$queryRaw` ter-parameter: `to_char(transaction_date, 'YYYY-MM')`, `type`, `SUM(amount)` … `GROUP BY` bulan & tipe)
  dalam rentang tanggal 1 bulan pertama s.d. akhir bulan berjalan, scope `user_id` session (index
  `(user_id, transaction_date)`). Kolom `DATE` = kalender Asia/Jakarta (ITA §4.1); bulan berjalan dari jam server.
  `getTrendReport(userId, currentMonth)`.
- **Server Action** `src/modules/reports/actions.ts`: `loadTrendReport()` — dipakai tombol "Coba lagi" agar hanya
  seksi tren yang dimuat ulang (UX-05), userId dari session.
- **UI** `src/components/reports/`: `trend-section` (client: seksi `reports-trend`, judul, legenda, info data kurang,
  grafik, rata-rata, tabel angka per bulan), `trend-chart` (client Recharts `BarChart`: 2 `Bar`, sumbu, area tap/hover
  per bulan `trend-bar-<yyyy-mm>`, tooltip), `trend-skeleton` (6 pasang batang abu), `trend-error` (pesan + "Coba
  lagi" via server action).
- **Halaman** `reports/page.tsx`: seksi tren lewat prop `footer` `ReportsView` dalam `<Suspense>` sendiri — tidak ikut
  selector bulan; gagal → `TrendError` (fault injection `e2e-fault=reports-trend-load`).
- Tanpa migration, tanpa dependency baru.

## Decisions (open questions)

- **Rata-rata pengeluaran:** mengikuti aturan eksplisit spec (story §2 Assumptions + testing.md): **total pengeluaran
  6 bulan ÷ 6**, termasuk bulan tanpa data (0) dan bulan berjalan; dibulatkan half-up ke Rupiah penuh. Alternatif
  "hanya bulan penuh sejak transaksi pertama" (lebih tidak bias) TIDAK dipakai karena bertentangan dengan angka
  ekspektasi testing.md (Rp 1.500.000 dan Rp 100.000). Aturan dijelaskan di UI lewat keterangan kecil di bawah angka
  ("Total pengeluaran 6 bulan ÷ 6, termasuk bulan berjalan & bulan tanpa transaksi"). Bila PO memilih aturan bulan
  penuh, cukup ubah `averageExpense` di `trend.ts` + testing.md.
- **"Bulan berdata"** = bulan dengan minimal satu transaksi (pemasukan atau pengeluaran) di jendela 6 bulan; < 2 →
  info box (juga untuk user tanpa transaksi; rata-rata Rp 0).
- **Interaksi (UX-02/03):** area tap/hover = seluruh pita bulan (pasangan batang). Mouse: hover = highlight + tooltip,
  keluar = tutup. Sentuh: tap = highlight + tooltip, tap bulan sama / di luar grafik = tutup. Tap batang **tidak**
  mengganti selector bulan (MVP).
- **Aksesibilitas:** grafik `role="img"` + `aria-label` ringkasan seluruh angka; tabel angka per bulan (Bulan,
  Pemasukan, Pengeluaran) di `<details>` "Lihat angka per bulan" — jalur keyboard & screen reader; legenda teks.
- **Error:** testing.md menyarankan `page.route`, tetapi data tren dirender server (RSC), jadi disimulasikan dengan fault
  injection cookie seperti E04-US02. "Coba lagi" memanggil server action → hanya seksi tren dimuat ulang, grafik
  kategori tidak tersentuh.
- **Tanpa animasi batang** (deterministik untuk E2E, langsung bisa di-tap).
- **Selector:** `reports-trend` (root seksi; locator E2E dibatasi ke sini), `trend-legend`, `trend-chart`,
  `trend-bar-<yyyy-mm>` (`data-active`, `data-income`, `data-expense`), `trend-tooltip` (+ `-month|-income|-expense`),
  `trend-average-expense` (`data-value`), `trend-insufficient-data`, `trend-table`, `trend-skeleton`,
  `trend-load-error`, `trend-retry-button`.
