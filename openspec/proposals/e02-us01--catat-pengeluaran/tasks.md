# Tasks — E02-US01 Catat pengeluaran

- [ ] Schema Zod transaksi + pesan (`src/modules/transactions/schema.ts`) + unit test
- [ ] Helper input nominal Rupiah (`src/lib/format.ts`) + unit test
- [ ] Kategori: `categorySlug`, urutan, `getActiveCategories` (tanpa arsip) + unit test
- [ ] Server Action `createTransactionAction` (kepemilikan/jenis/arsip kategori, revalidate) + unit test
- [ ] Query `getRecentTransactions` & `getMonthTotals` (`src/modules/transactions/queries.ts`)
- [ ] Komponen form (amount input, toggle jenis, grid kategori, tanggal, catatan, banner error, loading)
- [ ] Bottom sheet (HP) / dialog (desktop) + konfirmasi "Buang perubahan?" + FAB "+"
- [ ] Beranda minimal (total pengeluaran bulan ini + transaksi terbaru) & halaman Transaksi (daftar + FAB)
- [ ] E2E Playwright + page object `TransactionForm` + fixture `createUser` + smoke; aktifkan fixme E01-US01
- [ ] Verifikasi: lint, typecheck, format, unit test, build, E2E (E02-US01, regresi E01, smoke)
