# Tasks — E02-US05 Kelola kategori

- [ ] Schema & ikon: validasi nama/ikon, pesan, daftar 24 ikon
- [ ] Server Action tambah/ubah/arsip/pulihkan/hapus (scope `userId`, advisory lock, unik, minimal 1 aktif, batas 30)
- [ ] Query kategori + jumlah transaksi; `seedDefaultCategories` hanya untuk user tanpa kategori
- [ ] Route `/categories` + loading; UI tab, daftar aktif/terarsip, form sheet/dialog, konfirmasi hapus
- [ ] Menu akun → Kategori aktif; `ManageCategoriesLink` ber-`href`
- [ ] Unit test (Vitest): schema & actions (kepemilikan, unik, minimal 1 aktif, hapus vs arsip, pulihkan)
- [ ] E2E Playwright semua skenario US05 + smoke + regresi form/daftar/detail (HP & desktop); sesuaikan test lama
- [ ] Follow-up review E02-US04: dirty ternormalisasi (catatan di-trim), navigasi setelah simpan/hapus di modal
- [ ] Verifikasi: lint, format, unit, build, seluruh E2E + smoke dengan `next dev` dan `next start`
