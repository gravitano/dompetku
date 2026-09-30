# Tasks — E02-US04 Ubah dan hapus transaksi

- [ ] Schema: id transaksi, pesan ubah/hapus, `from=home` di `detailBackHref`
- [ ] Server Action `updateTransactionAction` & `deleteTransactionAction` (scope `userId`, NOT_FOUND, kategori
      terarsip hanya bila tidak berubah)
- [ ] UI: form mode ubah (dirty, Simpan perubahan, Dicatat ...), sheet bersama + Buang perubahan?, konfirmasi hapus,
      badge kategori terarsip
- [ ] Route: parallel `@modal` + intercepting `(.)transactions/[id]` (+ loading), halaman detail langsung, not found
- [ ] Beranda: baris transaksi terbaru bisa ditekan
- [ ] Unit test (Vitest): schema & action update/delete (termasuk kepemilikan)
- [ ] E2E Playwright semua skenario US04 + smoke (HP & desktop); sesuaikan test detail US03
- [ ] Verifikasi: lint, format, unit, build, seluruh E2E + smoke dengan `next dev` dan `next start`
