---
haie_story: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us01--dashboard-ringkasan-bulanan---story.md
status: draft
branch: dev/e04-us01--dashboard-ringkasan-bulanan
---

# E04-US01 — Dashboard ringkasan bulanan (Beranda)

## Why

Beranda adalah layar yang paling sering dilihat (BRD FEAT-010, BO-01, BO-03). Versi minimal dari E02 baru
menampilkan total pemasukan/pengeluaran dan transaksi terbaru. Acceptance criteria (story §3):

1. Setelah login diarahkan ke **Beranda**; tab/menu Beranda aktif.
2. Judul bulan berjalan ("Oktober 2026") + kartu **Pemasukan**, **Pengeluaran**, **Selisih** (format Rupiah).
3. Selisih hijau "+" (positif), merah "−" (negatif), netral (nol).
4. Ada anggaran → "Rp X dari Rp Y" + progress bar + link **"Lihat anggaran"**; total terpakai = seluruh pengeluaran
   bulan (definisi E03-US02).
   4a. Slot banner peringatan anggaran di atas kartu ringkasan (banner milik E03-US03).
5. Belum ada anggaran → ajakan **"Atur anggaran bulan ini"** ke tab Anggaran.
6. **5 transaksi terbaru** (tanggal transaksi terbaru, lalu waktu dicatat terbaru) dengan ikon, catatan/kategori,
   tanggal, nominal bertanda.
7. **"Lihat semua"** → tab Transaksi. 8. FAB **"+"**.
8. Ter-update setelah mencatat tanpa refresh. 10. Empty state pengguna baru + **"Catat pengeluaran"**.
9. Tampil < 2 detik. 12. Hanya data milik pengguna login.

## What Changes

- **Query** `src/modules/dashboard/queries.ts` — `getDashboardData(userId, now)`: satu `Promise.all` berisi
  `getMonthTotals`, `getRecentTransactions(userId, 5)`, `getBudgetSummary(userId, monthKey)` (bulan dihitung dari
  `now` yang sama agar konsisten di pergantian bulan). Tanpa N+1 (transaksi terbaru + kategori dalam satu query);
  waktu muat dicatat ke log server (`[beranda] data dimuat dalam X ms`).
- **View murni** `src/modules/dashboard/view.ts` — `buildDashboardView`: selisih + `netState`
  (`positive|negative|zero`), ringkasan anggaran (`budgetUsage` dari `~/modules/budgets/status`, tanpa ambang
  sendiri) atau `null` bila belum ada anggaran, `isNewUser` (belum punya transaksi sama sekali).
- **UI** `src/components/dashboard/`: `dashboard-summary-card` (UX-01; HP: pemasukan & pengeluaran berdampingan,
  selisih besar di bawah; desktop: tiga kolom), `dashboard-budget-card` (UX-02, memakai `BudgetProgress` +
  `BudgetStatusIcon` + `budgetBalanceLabel`), `dashboard-empty-state` (UX-06, membuka form catat pengeluaran),
  `dashboard-error` (UX-07, "Coba lagi"), `dashboard-skeleton` (Loading), `dashboard-view` (komposisi + slot
  `alerts` untuk banner E03-US03). `RecentTransactions` mendapat link **"Lihat semua"** (UX-03).
- **Halaman** `src/app/(app)/page.tsx`: header + periode tampil langsung, konten di `<Suspense>` dengan skeleton;
  FAB di `<Suspense>` terpisah sehingga tetap bisa dipakai saat konten dimuat / gagal. Kategori aktif dimuat satu
  kali (promise dibagi untuk FAB dan CTA empty state).
- **Error state:** kegagalan memuat ditangkap di halaman (bukan `error.tsx` grup `(app)` yang juga membungkus
  route lain) → pesan + tombol "Coba lagi" (`router.refresh()`). Fault injection E2E `e2e-fault=dashboard-load`
  (pola yang sama dengan E03-US02).
- Hapus `month-summary-card.tsx` (digantikan kartu dashboard dengan selector yang sama).
- Tanpa migration (index `(user_id, transaction_date)` sudah ada, ITA §4.2).

## Follow-up review E03-US02 (commit terpisah)

- Tepat 100%: teks "Sisa Rp 0" kini berwarna merah (tone mengikuti status: Hampir habis kuning, Terlampaui merah,
  Aman netral) di kartu ringkasan dan baris kategori; atribut `data-tone` untuk asersi E2E.
- Label status ("Hampir habis"/"Terlampaui") kini terlihat di samping ikon (teks kecil, tidak memecah layout HP).

## Decisions (open questions)

- **5 transaksi terbaru lintas bulan** (sesuai draft design): pengguna yang belum mencatat di bulan ini tetap melihat
  transaksi terakhirnya, ringkasan bulan ini Rp 0. Empty state hanya untuk pengguna tanpa transaksi sama sekali.
- **Sisa hari / rata-rata harian:** tidak ditampilkan (bukan AC).
- **Kartu anggaran Beranda:** "Rp X dari Rp Y", persentase + ikon/label status, progress bar, dan "Sisa/Lebih Rp Z"
  (aturan warna sama dengan E03-US02). Seluruh kartu tidak dibuat link; link eksplisit "Lihat anggaran".
- **Pengguna baru:** kartu ringkasan Rp 0 + ajakan anggaran tetap tampil, lalu empty state transaksi.
- **Target < 2 detik:** diverifikasi lewat log waktu muat + UAT (bukan budget Lighthouse di CI).
- **Selector:** `summary-income-total`, `summary-expense-total` (tetap), `summary-balance`
  (`data-state=positive|negative|zero`, `data-value`), `dashboard-period`, `budget-summary-card` (`data-status`),
  `budget-summary-text`, `budget-summary-percent`, `budget-summary-progress`, `budget-summary-remaining`,
  `budget-summary-link`, `budget-setup-cta`, `recent-transactions-see-all`, `recent-transaction-item`,
  `recent-transactions-empty` (empty state), `dashboard-empty-cta`, `dashboard-load-error`,
  `dashboard-retry-button`, `dashboard-skeleton`, `dashboard-alerts` (slot banner).

## Catatan untuk E03-US03 (banner Beranda)

- Pasang banner lewat prop `alerts` pada `DashboardView` (`src/components/dashboard/dashboard-view.tsx`); slot
  `dashboard-alerts` dirender di atas kartu ringkasan hanya bila `alerts` ada.
- Tambahkan query status per kategori ke `Promise.all` di `getDashboardData` (`src/modules/dashboard/queries.ts`),
  hitung status dengan `budgetStatus`/`budgetUsage` dari `~/modules/budgets/status`, tautkan ke `budgetsHref()`.
