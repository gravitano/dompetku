# Tasks — E02-US04 Ubah dan hapus transaksi

- [x] Schema: id transaksi, pesan ubah/hapus, `from=home` di `detailBackHref`
- [x] Server Action `updateTransactionAction` & `deleteTransactionAction` (scope `userId`, NOT_FOUND, kategori
      terarsip hanya bila tidak berubah)
- [x] UI: form mode ubah (dirty, Simpan perubahan, Dicatat ...), sheet bersama + Buang perubahan?, konfirmasi hapus,
      badge kategori terarsip
- [x] Route: parallel `@modal` + intercepting `(.)transactions/[id]` (+ loading), halaman detail langsung, not found
- [x] Beranda: baris transaksi terbaru bisa ditekan
- [x] Unit test (Vitest): schema & action update/delete (termasuk kepemilikan)
- [x] E2E Playwright semua skenario US04 + smoke (HP & desktop); sesuaikan test detail US03
- [x] Verifikasi: lint, format, unit, build, seluruh E2E + smoke dengan `next dev` dan `next start`

Hasil verifikasi: lint + typecheck, format, Vitest 307/307, `next build`, seluruh Playwright (termasuk smoke)
254/254 terhadap `next dev` dan 254/254 terhadap `next start`.
