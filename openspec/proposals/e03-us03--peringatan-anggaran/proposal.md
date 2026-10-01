---
haie_story: docs/features/phase-01-mvp/e-03---anggaran/e03-us03--peringatan-anggaran---story.md
status: in-progress
branch: dev/e03-us03--peringatan-anggaran
---

# E03-US03 — Peringatan anggaran

## Why

Indikator pemakaian (E03-US02) hanya membantu bila pengguna membuka halaman Anggaran. Peringatan di dalam aplikasi
yang muncul tepat saat pengeluaran dicatat membawa informasi pada momen paling relevan (BRD FEAT-009, BO-03; Should
Have). Acceptance criteria (story §3):

1. Simpan pengeluaran bulan berjalan yang membuat kategori naik Aman → **Hampir habis** → toast kuning setelah toast
   "Pengeluaran tersimpan": "Anggaran X sudah terpakai 85%. Sisa Rp 225.000."
2. Naik ke **Terlampaui** → toast merah: "Anggaran X terlampaui. Lebih Rp 180.000."
3. Aman → Terlampaui langsung → hanya toast Terlampaui.
4. Status tetap/turun → tanpa toast.
5. Aturan sama saat mengubah pengeluaran (FEAT-005).
6. Tanpa toast untuk pengeluaran di luar bulan berjalan dan kategori tanpa anggaran.
7. Toast punya tautan **"Lihat anggaran"** → halaman Anggaran bulan berjalan.
8. Beranda menampilkan banner ringkas "N kategori perlu perhatian: x terlampaui, y hampir habis" + tautan Anggaran.
9. Halaman Anggaran (bulan berjalan) menampilkan banner di atas kartu ringkasan berisi nama kategori per status.
10. Banner hilang sendiri bila tidak ada lagi kategori ≥ 80%.
11. Hanya data milik pengguna sendiri.

## What Changes

- **Logika peringatan murni** (`src/modules/budgets/alerts.ts`, isomorfik): `budgetAlertFor({categoryName, budget,
spentBefore, spentAfter})` → `BudgetAlert | null` memakai `budgetStatus` / `budgetUsage` / `isBudgetStatusRaised` /
  `budgetBalanceLabel` dari `~/modules/budgets/status` (tidak menghitung ambang sendiri); `budgetAlertMessage`;
  `budgetAttention(rows)` + teks banner Beranda & halaman Anggaran.
- **Deteksi naik level di server action** (`src/modules/transactions/actions.ts`): create & update pengeluaran
  dijalankan dalam `prisma.$transaction` — bila transaksi (hasil akhir) adalah pengeluaran bertanggal bulan berjalan
  (Asia/Jakarta) dan kategorinya punya anggaran bulan itu, total pengeluaran kategori dihitung sebelum & sesudah
  penulisan di transaksi DB yang sama (`getCategoryBudgetSpend`, `src/modules/budgets/queries.ts`). Hasil
  `ActionResult` menjadi `{ id, budgetAlert: BudgetAlert | null }`. Update yang memindahkan kategori/bulan/jenis
  mengevaluasi kategori tujuan di bulan berjalan; hapus tidak pernah memicu peringatan.
- **Toast** (`src/components/budgets/budget-alert-toast.tsx`): `showBudgetAlertToast` (sonner `toast.custom`, ±6
  detik) dipanggil setelah toast sukses di form catat (`transaction-form-dialog.tsx`) dan ubah
  (`transaction-detail-sheet.tsx`). Kuning `role="status"`, merah `role="alert"`, ikon + teks, tautan "Lihat anggaran"
  dan tombol ✕. Selector `budget-alert-toast` (`data-level=warning|over`), `budget-alert-toast-link`,
  `budget-alert-toast-close`.
- **Banner** (`src/components/budgets/budget-alert-banner.tsx`): Beranda (`home-budget-alert-banner`, tautan ke
  `/budgets`, mengisi prop `alerts` `DashboardView`) dan halaman Anggaran bulan berjalan (`budget-page-alert-banner`,
  di atas kartu ringkasan; diturunkan dari `sections.budgeted` tanpa query tambahan). `data-level=over` bila ada
  kategori Terlampaui, selain itu `warning`.
- **Optimasi Beranda** (catatan review E04-US01): `getMonthTotals` kini `groupBy [type, categoryId]` sehingga satu
  query memberi total pemasukan/pengeluaran **dan** pengeluaran per kategori; `getBudgetSummary` (aggregate
  pengeluaran kedua) diganti `getMonthBudgetList` (anggaran + nama kategori). `getDashboardData` tetap satu
  `Promise.all` (3 query, tanpa N+1); ringkasan anggaran & status kategori dihitung murni di `dashboard/view.ts`.
- Tanpa migration.

## Decisions (open questions)

- **Dismiss banner (design):** tidak bisa ditutup — banner hilang sendiri saat tidak ada kategori ≥ 80% (AC 10).
  Paling sederhana untuk MVP, tanpa state tambahan.
- **Opsi mematikan peringatan (design):** tidak ada untuk MVP (ambang tetap; pengaturan di luar scope). Toast bisa
  ditutup manual dan hanya muncul saat naik level, jadi tidak berulang.
- **Pindah kategori (QA):** ya — kategori tujuan dievaluasi; kategori asal (turun) tidak.
- **Anggaran diturunkan sehingga naik level (QA):** tanpa toast, cukup banner.
- **Tepat 100%:** Terlampaui; teks memakai `budgetBalanceLabel` ("Sisa Rp 0").
- **Kategori terarsip** beranggaran ikut dihitung di banner (konsisten dengan indikator E03-US02).
- **Posisi toast:** mengikuti `Toaster` global yang sudah ada (top-center) agar konsisten dengan toast lain; tidak
  dipindah khusus untuk fitur ini.
- **Gagal memuat banner:** data banner berasal dari query yang sama dengan ringkasan anggaran Beranda; bila gagal,
  error state Beranda (E04-US01) yang berlaku. Gagal cek peringatan = gagal simpan (satu transaksi DB) dan mengikuti
  error E02-US01.
- **Waktu E2E:** "Oktober 2026" = bulan berjalan menurut jam server (bukan `page.clock`, karena bulan dihitung di
  server); transaksi bertanggal 1 bulan berjalan.

## Catatan untuk story berikutnya

- **E04-US02/US03 (Laporan):** pakai `getMonthTotals` (sudah memberi `expenseByCategory`) untuk breakdown kategori
  bulan berjalan, atau `getMonthExpenseByCategory(userId, month)` untuk bulan apa pun; status anggaran tetap dari
  `~/modules/budgets/status`.
