---
haie_story: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us01--catat-pengeluaran---story.md
status: implemented
branch: dev/e02-us01--catat-pengeluaran
---

# E02-US01 — Catat pengeluaran

## Why

Pencatatan pengeluaran adalah aksi paling sering di DompetKu dan sumber data untuk anggaran & laporan
(BRD FEAT-003, BO-01, BO-02). Acceptance criteria (story §3):

1. Dari halaman utama, form "Catat Pengeluaran" terbuka dengan satu tap/klik.
2. Form: **Nominal** (wajib), **Kategori** (wajib, hanya kategori pengeluaran milik pengguna), **Tanggal** (wajib,
   default hari ini), **Catatan** (opsional).
3. Nominal diformat Rupiah dengan pemisah ribuan saat diketik (`Rp 25.000`).
4. 0 < nominal ≤ Rp 1.000.000.000; selain itu pesan di bawah field dan tidak tersimpan.
5. Tanggal tidak boleh melebihi hari ini.
6. Catatan maksimal 100 karakter.
7. Field tidak valid → data lain yang sudah diisi tidak hilang.
8. Berhasil → toast "Pengeluaran tersimpan", form tertutup, transaksi langsung muncul di daftar, total pengeluaran
   bulan berjalan bertambah.
9. Tombol Simpan tidak bisa ditekan dua kali (tidak ada transaksi ganda).
10. Gagal simpan (mis. koneksi putus) → pesan error, data form tetap, bisa coba lagi.
11. Pengeluaran hanya dapat dilihat pemiliknya.
12. Pengguna terbiasa dapat mencatat 1 pengeluaran < 15 detik di HP (diverifikasi manual saat UAT).

## What Changes

- `src/modules/transactions/schema.ts` — schema Zod isomorfik `transactionSchema` (jenis, nominal string digit →
  number, `categoryId` UUID, tanggal `YYYY-MM-DD` ≤ hari ini Asia/Jakarta, catatan ≤ 100 → `null` bila kosong),
  konstanta (`TRANSACTION_AMOUNT_MAX`, `NOTE_MAX_LENGTH`) & `TRANSACTION_MESSAGES`. Schema sudah menerima
  `type: EXPENSE | INCOME` agar E02-US02 tidak perlu mengubah kontrak.
- `src/modules/transactions/actions.ts` — Server Action `createTransactionAction()`: `requireUser()` → validasi Zod →
  cek kategori **milik user, jenis sama dengan transaksi, tidak terarsip** → insert (`amount` BigInt, `transactionDate`
  DATE) → `revalidatePath("/", "layout")` → `ActionResult<{ id }>`.
- `src/modules/transactions/queries.ts` — `getRecentTransactions(userId, limit)` dan `getMonthTotals(userId)`
  (total pemasukan & pengeluaran bulan berjalan Asia/Jakarta). Versi minimal yang nanti diperluas E02-US03/E04-US01.
- `src/modules/categories/queries.ts` — `getActiveCategories(userId)` (dikelompokkan per jenis, tanpa kategori
  terarsip); `src/modules/categories/options.ts` — `categorySlug()` & urutan kategori (isomorfik).
- `src/lib/format.ts` — helper input nominal (`parseAmountInput`, `formatAmountInput`).
- Komponen `~/components/transactions/`: `add-transaction-button.tsx` (FAB "+"), `transaction-form-dialog.tsx`
  (bottom sheet di HP / dialog di desktop dalam satu Radix Dialog responsif + konfirmasi "Buang perubahan?"),
  `transaction-form.tsx`, `amount-input.tsx`, `transaction-type-toggle.tsx`, `recent-transactions.tsx`,
  `expense-summary-card.tsx`; `~/components/categories/category-grid.tsx`, `category-icon.tsx`.
- Halaman `/` (Beranda): kartu "Pengeluaran bulan ini" + daftar transaksi terbaru + FAB (placeholder minimal sampai
  E04-US01). Halaman `/transactions`: daftar transaksi terbaru + FAB (placeholder sampai E02-US03).
- Tidak ada perubahan skema Prisma (tabel `transactions` & `categories` sudah ada di migrasi awal).

## Decisions (open questions)

- **Kategori paling sering dipakai di depan? (UX):** tidak di MVP. Urutan tetap: kategori bawaan sesuai urutan
  `DEFAULT_EXPENSE_CATEGORIES`, lalu kategori custom (E02-US05) alfabetis. Urutan yang stabil lebih cepat dihafal
  (muscle memory) daripada urutan yang berubah-ubah; bisa ditinjau ulang setelah ada data pemakaian.
- **Tombol "Simpan & catat lagi"? (UX):** tidak di MVP. Setelah simpan form tertutup (AC 8); membuka lagi cukup 1 tap FAB.
- **Batas Rp 1.000.000.000 per transaksi (QA):** dipakai sesuai AC 4 (`TRANSACTION_AMOUNT_MAX`), dicek di client & server.
  Input nominal dibatasi 13 digit agar nilai di atas batas tetap bisa diketik dan memunculkan pesan error.
- **Batas tanggal mundur (QA):** tidak ada batas bisnis (pengguna boleh mencatat transaksi lama). Hanya batas teknis
  minimum `2000-01-01` untuk menolak tanggal tidak masuk akal. Tanggal masa depan ditolak di client (`max` date
  picker + Zod) dan di server (Zod dievaluasi ulang dengan jam server, zona Asia/Jakarta).
- **Date picker:** `<input type="date">` native (keyboard/picker bawaan HP, atribut `max` = hari ini sehingga tanggal
  setelah hari ini tidak bisa dipilih) + pintasan **Hari ini** / **Kemarin** dan label "Hari ini, 30 Sep 2026".
- **Toggle Pengeluaran | Pemasukan:** tampil sesuai design US01 dengan default Pengeluaran; opsi **Pemasukan**
  masih nonaktif ("Segera hadir") karena logika & AC pemasukan milik E02-US02. Kontrak server (schema + action) sudah
  generik per jenis, sehingga US02 cukup mengaktifkan mode pemasukan di UI.
- **Bottom sheet vs dialog:** satu Radix Dialog dengan kelas responsif (bawah layar & sudut atas membulat di < `md`,
  dialog tengah di ≥ `md`) — tanpa deteksi viewport di JS sehingga tidak ada hydration mismatch.
- **Nominal:** input teks `inputMode="numeric"`; nilai tampilan diformat `Rp 1.500.000`, posisi kursor dipertahankan
  berdasarkan jumlah digit di kiri kursor; nilai form berupa string digit (tanpa float).
- **Kategori tidak valid di server:** kategori milik user lain, jenis berbeda, atau terarsip → `VALIDATION_ERROR` pada
  field `categoryId` ("Kategori tidak valid. Pilih kategori lain.") — tidak membedakan "tidak ada" vs "milik orang lain".
- **Refresh data setelah simpan:** `revalidatePath("/", "layout")` di Server Action; Beranda & Transaksi dinamis
  sehingga daftar & total ikut diperbarui dalam respons yang sama.
- **Buka lagi cepat setelah Simpan:** form diberi `key` per sesi buka (selalu mulai kosong), overlay di `z-49`
  (selalu di bawah konten), dan focus/pointerdown dari FAB sendiri tidak menutup dialog — mencegah race saat
  "+" ditekan sebelum animasi tutup selesai.
- **Beranda minimal:** kartu "Pengeluaran bulan ini" (`summary-expense-total`) dan 5 transaksi terbaru
  (`recent-transaction-item`) memakai selector E04-US01 agar bisa diperluas tanpa mengubah test.

## Validation

- Unit (Vitest): `transactionSchema`, helper nominal, `categorySlug`/urutan kategori, `createTransactionAction`
  (validasi, kepemilikan/jenis/arsip kategori, BigInt/DATE, revalidate, error sistem, unauthorized).
- E2E (Playwright, mobile 390×844 & desktop 1280×800): semua skenario `e02-us01--catat-pengeluaran---testing.md` →
  `test/web/features/e02-us01-catat-pengeluaran.spec.ts` + smoke `test/web/smoke/catat-pengeluaran.spec.ts`; test
  `test.fixme` E01-US01 "kategori bawaan tampil di form Catat Pengeluaran" diaktifkan.
- Data uji: setiap test membuat akun baru (`budi+…@example.com`, `ani+…@example.com`) lewat fixture `createUser`
  (user + kategori bawaan, tanpa transaksi) karena test berjalan paralel di 2 viewport — total bulan berjalan tetap
  deterministik tanpa reset seed. Akun `lock@example.com` tidak dipakai.
