# Tasks — E03-US01 Atur anggaran kategori

- [x] Schema budget: nominal, bulan (lampau read-only, maksimal +1 bulan), pesan, URL `?month=`
- [x] Advisory lock kategori dipindah ke `categories/lock.ts`, dipakai bersama action anggaran
- [x] Server Action atur/ubah (upsert), hapus, salin dari bulan lalu (scope `userId`, kategori aktif pengeluaran)
- [x] Query halaman anggaran + query ringkasan reusable (E03-US02, E04-US01)
- [x] Route `/budgets` + loading; UI navigasi bulan, total, daftar, form sheet/dialog, konfirmasi hapus, salin
- [x] E02-US05: kategori dengan anggaran tidak bisa dihapus; migration FK budget → kategori `Restrict`
- [x] Seed contoh anggaran
- [x] Unit test (Vitest): schema, view, actions (kepemilikan, unik, bulan, salin, kategori terarsip, hapus kategori)
- [x] E2E Playwright semua skenario US01 + smoke (HP & desktop) + regresi hapus kategori E02-US05
- [x] Verifikasi: lint, format, unit, build, seluruh E2E + smoke dengan `next dev` dan `next start`
