---
haie_story: docs/features/phase-01-mvp/e-03---anggaran/e03-us02--indikator-pemakaian-anggaran---story.md
status: in-progress
branch: dev/e03-us02--indikator-pemakaian-anggaran
---

# E03-US02 — Indikator pemakaian anggaran

## Why

Anggaran (E03-US01) baru berguna bila pengguna bisa melihat posisinya setiap saat (BRD FEAT-008, BO-03). Halaman
**Anggaran** saat ini hanya menampilkan nominal anggaran. Acceptance criteria (story §3):

1. Setiap kategori beranggaran menampilkan **terpakai**, **anggaran**, **sisa**, **persentase**, dan **progress bar**.
2. Warna status: hijau < 80%, kuning 80% s.d. < 100%, merah ≥ 100%.
3. Persentase tampil dibulatkan ke bawah (79,6% → "79%"); status memakai nilai sebenarnya.
4. Terpakai > anggaran → "Lebih Rp X" merah, progress bar penuh.
5. Kartu ringkasan **Total terpakai** vs **Total anggaran** + sisa/lebih dengan aturan warna yang sama.
6. Kategori tanpa anggaran tapi ada pengeluaran → bagian **"Tanpa anggaran"** + tautan "Atur anggaran".
7. Kategori tanpa anggaran & tanpa pengeluaran tetap "Belum diatur".
8. Angka diperbarui setelah transaksi ditambah/diubah/dihapus tanpa refresh manual.
9. Indikator juga tampil di bulan lampau (read-only).
10. Hanya data milik pengguna sendiri.

## What Changes

- **Fungsi status murni** (`src/modules/budgets/status.ts`, isomorfik — dipakai ulang E03-US03 & E04-US01):
  `budgetStatus(spent, budget)` → `"safe" | "warning" | "over"` (hitungan BigInt, tanpa floating point),
  `budgetPercent` (dibulatkan ke bawah), `budgetUsage` (persen, status, sisa, kelebihan, lebar bar),
  `compareBudgetUsage` (rasio tertinggi dulu), `isBudgetStatusRaised` (naik level — untuk peringatan E03-US03),
  `budgetBalanceLabel` ("Sisa Rp X" / "Lebih Rp X"), label & warna status (`Aman`/`Hampir habis`/`Terlampaui`,
  `green`/`yellow`/`red`).
- **View** (`src/modules/budgets/view.ts`): `BudgetRow` diberi `spent`; `buildBudgetRows` menerima pengeluaran per
  kategori (kategori terarsip ikut tampil bila punya anggaran **atau** pengeluaran bulan tsb);
  `groupBudgetRows` → `budgeted` (urut persentase tertinggi), `unbudgeted` (ada pengeluaran, tanpa anggaran; urut
  nominal terbesar), `notSet` (tanpa anggaran & tanpa pengeluaran).
- **Query** `getBudgetMonth` memakai `getMonthExpenseByCategory`; `totalSpent` = jumlah seluruh pengeluaran bulan
  (definisi sama dengan `getBudgetSummary`, keputusan PO).
- **UI** (`~/components/budgets/`): `budget-summary-card.tsx` (UX-01), `budget-progress.tsx` (bar + `role=progressbar`),
  `budget-status-icon.tsx` (⚠ / ⛔ + teks status untuk pembaca layar), baris beranggaran dengan indikator (UX-02),
  bagian "Tanpa anggaran" dengan tombol "Atur anggaran" yang membuka form E03-US01 (UX-03), bagian "Belum diatur",
  skeleton diperbarui (Loading).
- **Error state:** `src/app/(app)/budgets/error.tsx` — "Gagal memuat anggaran. Coba lagi." + tombol **Coba lagi**
  (`budget-load-error`, `budget-retry-button`).
- **Fault injection E2E** (`src/lib/fault-injection.ts`): kegagalan memuat bisa disimulasikan lewat cookie
  `e2e-fault=budgets-load` **hanya** bila env server `E2E_FAULT_INJECTION=true` (di-set oleh Playwright
  `webServer`; tidak pernah di produksi). Tanpa ini skenario "server tidak dapat dihubungi" tidak bisa diuji
  deterministik: kegagalan fetch RSC membuat router Next jatuh ke navigasi browser biasa.
- **Token warna** `--budget-safe|warning|over` (+ varian teks untuk kontras) di `globals.css` (light & dark).
- Tanpa migration.

## Decisions (open questions)

- **Ringkasan total (UX open question):** menghitung **seluruh** pengeluaran bulan (keputusan PO, sesuai BO-03 dan
  definisi `getBudgetSummary` untuk Beranda E04-US01).
- **"Sisa per hari":** tidak diimplementasikan (bukan AC; dicatat sebagai ide lanjutan).
- **Tepat 100%:** merah ("Terlampaui") dengan teks "Sisa Rp 0"; "Lebih Rp X" hanya bila terpakai > anggaran.
- **Anggaran 0 (data tidak valid, mis. tidak ada anggaran sama sekali):** pengeluaran 0 → 0% Aman; pengeluaran > 0 →
  100% Terlampaui. Kartu ringkasan tanpa anggaran tidak menampilkan persentase/status, tetapi tetap menampilkan
  total anggaran Rp 0 dan total terpakai.
- **Urutan baris beranggaran:** rasio terpakai/anggaran sebenarnya (bukan persen tampilan) tertinggi dulu; seri →
  urutan E03-US01 (kategori aktif urutan form, lalu terarsip).
- **Kategori diarsipkan di tengah bulan (QA):** anggarannya tetap tampil dengan indikator, read-only, label
  "Diarsipkan"; pengeluaran kategori terarsip tanpa anggaran tampil di "Tanpa anggaran" (tanpa tombol Atur
  anggaran, label "Diarsipkan") agar total ringkasan selalu bisa ditelusuri.
- **Bulan lampau:** indikator tampil, baris tidak bisa ditap, tombol "Atur anggaran" disembunyikan.
- **Transaksi dipindah kategori (QA):** E2E memverifikasi kedua kategori dalam satu skenario.
- **Aksesibilitas:** status tidak hanya warna — ikon ⚠/⛔ + teks status (`sr-only`), `aria-valuetext` pada progress
  bar, teks "Lebih Rp X".
- **Selector:** `budget-summary-card` (`data-status`), `budget-summary-spent`, `budget-summary-percent`,
  `budget-summary-remaining`, `budget-total` (tetap); baris `budget-row-<slug>` (`data-status=green|yellow|red`,
  `data-percent`) dengan `-spent`, `-amount` (tetap = nominal anggaran), `-percent`, `-remaining`, `-progress`;
  `budget-unbudgeted-section`, `budget-unbudgeted-set-<slug>`, `budget-notset-section`; `budget-load-error`,
  `budget-retry-button`.

## Catatan untuk story berikutnya

- **E03-US03 (peringatan):** pakai `budgetStatus` / `budgetUsage` / `isBudgetStatusRaised` dari
  `~/modules/budgets/status` — jangan menghitung ambang sendiri. Teks toast memakai `budgetBalanceLabel`.
- **E04-US01 (Beranda):** `getBudgetSummary` + `budgetUsage(totalSpent, totalBudget)`; komponen `BudgetProgress`
  bisa dipakai ulang untuk bar total.
