# Tasks — E02-US05 Kelola kategori

- [x] Schema & ikon: validasi nama/ikon, pesan, daftar 24 ikon
- [x] Server Action tambah/ubah/arsip/pulihkan/hapus (scope `userId`, advisory lock, unik, minimal 1 aktif, batas 30)
- [x] Query kategori + jumlah transaksi; `seedDefaultCategories` hanya untuk user tanpa kategori
- [x] Route `/categories` + loading; UI tab, daftar aktif/terarsip, form sheet/dialog, konfirmasi hapus
- [x] Menu akun → Kategori aktif; `ManageCategoriesLink` ber-`href`
- [x] Unit test (Vitest): schema & actions (kepemilikan, unik, minimal 1 aktif, hapus vs arsip, pulihkan)
- [x] E2E Playwright semua skenario US05 + smoke + regresi form/daftar/detail (HP & desktop); sesuaikan test lama
- [x] Follow-up review E02-US04: dirty ternormalisasi (catatan di-trim), navigasi setelah simpan/hapus di modal
- [x] Verifikasi: lint, format, unit, build, seluruh E2E + smoke dengan `next dev` dan `next start`

Hasil verifikasi: lint + typecheck, format, Vitest 348/348, `next build`, seluruh Playwright (termasuk smoke)
304/304 terhadap `next dev` dan 304/304 terhadap `next start`.
