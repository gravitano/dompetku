---
haie_story: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us02--catat-pemasukan---story.md
status: in-progress
branch: dev/e02-us02--catat-pemasukan
---

# E02-US02 — Catat pemasukan

## Why

Tanpa data pemasukan, ringkasan bulanan hanya menampilkan pengeluaran dan pengguna tidak tahu apakah dirinya surplus
atau defisit (BRD FEAT-003, BO-01, BO-02). Pemasukan dicatat dari form yang sama dengan E02-US01 lewat toggle jenis.
Acceptance criteria (story §3):

1. Toggle **Pengeluaran | Pemasukan** di form, default Pengeluaran.
2. Mode Pemasukan: judul "Catat Pemasukan", hanya kategori pemasukan milik pengguna, kategori terpilih dikosongkan.
3. Nominal & catatan tetap saat toggle diubah.
4. Field & validasi sama dengan E02-US01 (0 < nominal ≤ Rp 1.000.000.000, tanggal ≤ hari ini, catatan ≤ 100).
5. Berhasil → toast "Pemasukan tersimpan", form tertutup, transaksi tampil dengan **+** hijau, total pemasukan bulan
   berjalan bertambah.
6. Pemasukan tidak menambah total pengeluaran.
7. Tombol Simpan tidak bisa ditekan dua kali.
8. Gagal simpan → pesan error, data form (termasuk jenis) tetap.
9. Pemasukan hanya terlihat oleh pemiliknya.

## What Changes

Kontrak server (schema Zod, `createTransactionAction` yang mengecek kategori milik user + jenis sama + tidak terarsip,
`getMonthTotals` yang sudah mengembalikan `income`) sudah generik sejak E02-US01, sehingga story ini terutama di UI:

- `transaction-form.tsx` / `transaction-type-toggle.tsx` — opsi **Pemasukan** diaktifkan (prop `disabledTypes`
  dihapus); pindah jenis mengosongkan kategori, mempertahankan nominal/tanggal/catatan, dan memfokuskan Nominal.
  Aksen hijau di mode pemasukan: tombol Simpan (token baru `--income-action` agar kontras teks ≥ 4.5:1) dan highlight
  kategori terpilih (`CategoryGrid` prop `tone`).
- Empty state kategori per jenis: "Belum ada kategori pemasukan" / "Belum ada kategori pengeluaran" + tautan
  **Kelola kategori** (`~/components/categories/manage-categories-link.tsx`); tombol Simpan nonaktif.
- Beranda: `ExpenseSummaryCard` → `MonthSummaryCard` berisi "Pemasukan bulan ini" (`summary-income-total`, hijau) dan
  "Pengeluaran bulan ini" (`summary-expense-total`, merah) — selector mengikuti E04-US01.
- `src/lib/format.ts` `parseAmountInput` (temuan reviewer E02-US01): bagian desimal di akhir (`,` + 1–2 digit, mis.
  "Rp 25.000,00", "1.500.000,50") diabaikan sebelum mengambil digit, sehingga paste nominal tidak lagi dikali 100.
- Tidak ada perubahan skema Prisma / migrasi.

## Decisions (open questions)

- **Ingat jenis terakhir? (UX):** tidak. AC 1 menetapkan default Pengeluaran dan pengeluaran jauh lebih sering
  dicatat; default yang selalu sama lebih mudah diprediksi. Pindah ke Pemasukan hanya 1 tap.
- **Shortcut terpisah (long-press FAB) ke mode Pemasukan? (UX):** tidak di MVP — long-press tidak dapat ditemukan
  (_discoverable_) dan tidak ada padanannya di desktop/keyboard. Bisa ditinjau setelah ada data pemakaian.
- **Skenario pemasukan tanggal bulan sebelumnya (QA):** ditambahkan sebagai test E2E regresi ringan — pemasukan
  bertanggal bulan lalu tersimpan dan tampil di daftar tetapi tidak menambah "Pemasukan bulan ini".
  Laporan per bulan tetap diuji di E04.
- **"Kelola kategori" sebelum E02-US05 ada:** halaman Kategori belum dibuat, sehingga tautan ditampilkan nonaktif
  (`aria-disabled`, keterangan "segera hadir") agar tidak mengarah ke 404 — konsisten dengan item menu akun
  "Kategori" yang juga masih nonaktif. E02-US05 cukup memberi `href` pada `ManageCategoriesLink`.
- **Warna tombol Simpan:** pengeluaran tetap warna utama (tidak berubah dari E02-US01); pemasukan hijau
  (`bg-income-action`). Warna `--income` (teks) terlalu terang untuk latar tombol dengan teks putih, maka dibuat token
  terpisah yang lebih gelap di tema terang dan lebih terang (teks gelap) di tema gelap.
- **Fokus saat toggle:** setelah memilih jenis, fokus kembali ke Nominal (design §States Default) agar alur
  toggle → ketik nominal tetap cepat (BO-02).
- **Paste nominal:** hanya pola `,` + 1–2 digit di **akhir** teks yang dianggap desimal ("Rp 25.000,00" → 25.000,
  "25,5" → 25). `,` + 3 digit tetap dianggap pemisah ribuan ("25,000" → 25.000); titik selalu pemisah ribuan
  (format Indonesia). Sufiks ",-" ("Rp 25.000,-") sudah benar karena bukan digit.
- **Total pemasukan di halaman Transaksi:** belum; ringkasan per periode milik E02-US03/E04-US01. Beranda menampilkan
  keduanya.

## Validation

- Unit (Vitest): `parseAmountInput` (paste dengan/tanpa "Rp", spasi, titik ribuan, koma desimal), action menyimpan
  INCOME & menolak kategori jenis lain, `getMonthTotals` (pemasukan tidak masuk total pengeluaran).
- E2E (Playwright, mobile 390×844 & desktop 1280×800): semua skenario `e02-us02--catat-pemasukan---testing.md` →
  `test/web/features/e02-us02-catat-pemasukan.spec.ts` + smoke `test/web/smoke/catat-pemasukan.spec.ts`, plus empty
  state kategori pemasukan, tombol hijau, pemasukan bulan lalu, dan paste nominal. Regresi E01 & E02-US01 (test
  "Pemasukan nonaktif" diperbarui).
- Data uji: akun baru per test lewat fixture `createUser` (bukan `lock@example.com`).
