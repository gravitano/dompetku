---
haie_story: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us02--grafik-pengeluaran-kategori---story.md
status: implemented
branch: dev/e04-us02--grafik-pengeluaran-kategori
---

# E04-US02 — Grafik pengeluaran per kategori (tab Laporan)

## Why

Pain point utama BRD: "tidak tahu uang habis ke mana" (FEAT-011, BO-03). Tab Laporan masih placeholder.
Acceptance criteria (story §3):

1. Tab **Laporan** di bottom nav (HP) & sidebar (desktop); default bulan berjalan.
2. Navigasi **◀ / ▶**; ▶ nonaktif di bulan berjalan.
3. **Total pengeluaran** + **donut chart** porsi per kategori.
4. **Daftar kategori** di bawah grafik, urut terbesar: warna/ikon, nama, nominal lengkap, persentase.
5. Hanya kategori dengan pengeluaran bulan itu; kategori terarsip tetap tampil.
6. Jumlah nominal = total; jumlah persentase ≈ 100% (selisih pembulatan ≤ 0,1%).
7. Tap kategori (grafik/daftar) → **daftar transaksi** terfilter kategori + bulan (E02-US03).
8. Bulan tanpa pengeluaran → empty state "Belum ada pengeluaran di bulan ini".
9. Informasi tidak hanya lewat warna (nama, nominal, persen selalu teks).
10. Hanya transaksi milik pengguna login.

## What Changes

- **Dependency:** `recharts` (^3, kompatibel React 19; ITA §3.2) + `react-is` (peer) di package `web`.
- **Format** `~/lib/format`: `formatRupiahShort` ("Rp 2 jt", "Rp 1,2 jt", "Rp 500 rb", "Rp 1,5 M"; half-up 1 desimal,
  naik satuan bila pembulatan mencapai 1.000) dan `formatPercentTenths` ("12,5%").
- **Logika murni** `src/modules/reports/view.ts`: `buildExpenseCategoryReport` (filter > 0, urut nominal → nama,
  persentase, warna per peringkat, kunci slug unik, tautan `transactionListHref({ month, categoryIds })`, irisan
  "Lainnya"), `percentTenths`, `parseReportMonthParam`, `reportsHref`, `REPORT_MESSAGES`. Hasil hanya string/number
  (nominal sebagai string digit) — tanpa BigInt ke client.
- **Query** `src/modules/reports/queries.ts`: `getMonthExpenseByCategory` (groupBy, index `(user_id,
transaction_date)`) + satu `findMany` kategori yang muncul (termasuk terarsip), scope `userId` session.
- **UI** `src/components/reports/`: `reports-view` (client: header, `MonthNavigator` dengan test id `report-month-*`,
  skeleton saat pindah bulan, slot `footer`), `expense-category-report` (total + donut + daftar / empty state),
  `expense-category-chart` (client Recharts), `category-breakdown-list`, `report-skeleton`, `report-error`.
- **Halaman** `src/app/(app)/reports/page.tsx`: `?month=YYYY-MM`, selector bulan tampil langsung, seksi bulanan di
  `<Suspense>` + skeleton; gagal → pesan + "Coba lagi" (`router.refresh()`); fault injection `e2e-fault=reports-load`.
- **Token warna** `globals.css`: `--category-1…8` + `--category-other` (terang & gelap) dari palet kategorikal
  tervalidasi (CVD ΔE irisan berdampingan ≥ 8 di kedua mode); kontras < 3:1 beberapa warna di mode terang
  dikompensasi daftar teks yang selalu tampil.
- Tanpa migration.

## Follow-up review E03-US03 (commit terpisah)

- `saveWithBudgetAlert` (`modules/transactions/actions.ts`): bila tidak ada yang dipantau (pemasukan / bulan lain)
  langsung `write(prisma)` tanpa `$transaction` interaktif. Unit test memastikan `$transaction` tidak dipanggil.

## Decisions (open questions)

- **> 8 kategori:** donut menampilkan 7 kategori terbesar + irisan **"Lainnya"** (abu netral, tooltip "Lainnya (N
  kategori)", tap kedua → daftar transaksi terfilter semua kategori tsb). Daftar di bawah grafik **tetap lengkap**;
  baris yang digabung memakai titik warna "Lainnya". Maksimal 8 warna = palet tervalidasi (tidak ada warna ke-9).
- **Batas ◀:** sama dengan tab Transaksi (`TRANSACTION_MONTH_MIN` = Jan 2000, batas tanggal transaksi); bulan tanpa
  data menampilkan empty state. `?month=` tidak valid/masa depan → bulan berjalan.
- **Persentase:** half-up 1 desimal; bila total menyimpang > 0,1 poin dari 100% (banyak kategori kecil), koreksi
  metode sisa terbesar hingga selisih ≤ 0,1. Tiga kategori sama besar tetap 33,3% (total 99,9%). Nominal > 0 yang
  dibulatkan 0,0% tampil "< 0,1%".
- **Urutan & warna:** nominal terbesar dulu, seri → nama (locale id). Warna mengikuti peringkat bulan itu (palet
  urutan tetap, tidak diputar) dan sama persis antara irisan dan titik di daftar.
- **Interaksi irisan (UX-02):** mouse — hover = highlight + tooltip, klik = buka daftar; sentuh — tap pertama =
  highlight + tooltip, tap kedua = buka daftar. Tooltip melayang di titik tengah irisan aktif. Grafik `role="img"`
  - ringkasan teks (aria-label); irisan tidak fokus keyboard — jalur keyboard/screen reader = daftar (tautan).
- **Tanpa animasi donut:** irisan langsung di posisi akhir (bisa langsung di-tap, deterministik untuk E2E).
- **Tap kategori** membawa filter `month` + `category` saja (tanpa `type`), sesuai "filter kategori dan bulan".
- **Perbandingan dengan bulan lalu per kategori:** tidak (MVP).
- **Selector:** `reports-page` (root, semua locator E2E dibatasi ke sini), `report-month-prev|next|label`,
  `report-total-expense` (`data-value`), `expense-category-chart`, `chart-segment-<key>` (`data-active`,
  `data-hit-x|y` = titik tengah irisan), `chart-tooltip` (+ `-name|-amount|-percent`), `chart-center-total`,
  `category-breakdown-item` (`data-category=<key>`, `data-amount`, `data-percent`; anak `category-breakdown-name|
archived|percent|amount`), `report-empty-state`, `report-load-error`, `report-retry-button`, `report-skeleton`.

## Catatan untuk E04-US03 (tren 6 bulan)

- Pasang seksi tren lewat prop `footer` `ReportsView` (`src/components/reports/reports-view.tsx`) — dirender di
  bawah seksi bulanan, tidak ikut skeleton/selector bulan. Bungkus dengan `<Suspense>` sendiri di `reports/page.tsx`.
- Reuse: `formatRupiahShort` (sumbu Y "Rp 1,5 jt"), `formatRupiah` (tooltip), token `--income`/`--expense` (warna
  batang pemasukan/pengeluaran; legenda teks wajib), pola `ReportSkeleton`/`ReportError` + fault injection, pola
  "data dihitung server → string digit ke client".
- Query: pola `getMonthExpenseByCategory`/`groupBy` per `type`; untuk 6 bulan cukup satu `groupBy` `[type,
transactionDate]` atau raw `date_trunc('month')` dalam rentang 6 bulan, scope `userId`.
