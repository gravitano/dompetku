# USER STORY

## Story Metadata

### Title
E02-US03 — Daftar transaksi dengan filter

### Priority
High (Must Have, FEAT-004)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Melihat semua transaksi saya per bulan, dikelompokkan per tanggal, dan bisa memfilternya berdasarkan jenis dan kategori

### So that
Saya bisa menelusuri ke mana saja uang saya pergi dan menemukan transaksi tertentu dengan cepat

### Business Value
Daftar transaksi adalah tempat pengguna memeriksa ulang catatannya. Dengan memfilter per kategori, pengguna bisa langsung melihat, misalnya, semua pengeluaran "Makan & Minum" bulan ini beserta totalnya. Ini langsung menjawab masalah utama di BRD: "tidak tahu uang habis ke mana". Daftar ini juga menjadi pintu masuk untuk mengubah dan menghapus transaksi (E02-US04).

## 2. Delivery Context

### Assumptions
- Periode yang dipakai adalah bulan kalender (zona Asia/Jakarta), dan defaultnya bulan berjalan.
- Transaksi diurutkan dari tanggal terbaru. Transaksi di tanggal yang sama diurutkan dari yang terakhir dicatat.
- Volume transaksi per bulan untuk pengguna personal umumnya < 300.

### Dependencies
- E02-US01 dan E02-US02: sumber data transaksi.
- E01 Login & logout (FEAT-002).

### Out of Scope
- Pencarian teks bebas berdasarkan catatan.
- Filter rentang tanggal custom (lintas bulan).
- Ekspor daftar (CSV/Excel).
- Grafik (EPIC-004).

## 3. Acceptance

### Acceptance Criteria
1. Tab **Transaksi** menampilkan transaksi bulan berjalan secara default, dikelompokkan per tanggal dengan header tanggal (contoh: "Rabu, 30 Sep 2026").
2. Setiap baris menampilkan:
   - ikon dan nama kategori;
   - catatan, atau nama kategori jika catatan kosong;
   - nominal bertanda **−** (merah) untuk pengeluaran dan **+** (hijau) untuk pemasukan.
3. Di bagian atas ada navigasi bulan **◀ September 2026 ▶**. Tombol ▶ nonaktif jika bulan yang ditampilkan adalah bulan berjalan.
4. Pengguna dapat memfilter berdasarkan **Jenis** (Semua / Pengeluaran / Pemasukan) dan **Kategori** (satu atau lebih kategori, termasuk kategori terarsip).
5. Ringkasan di atas daftar menampilkan **Total Pemasukan**, **Total Pengeluaran**, dan **Selisih** untuk periode dan filter yang sedang aktif.
6. Filter yang aktif ditampilkan sebagai chip yang bisa dihapus satu per satu, dan ada tombol "Reset filter".
7. Filter tetap berlaku saat pengguna berpindah bulan.
8. Jika tidak ada transaksi pada periode atau filter aktif, muncul pesan kosong yang sesuai:
   - tanpa filter: pesan kosong beserta tombol untuk mencatat transaksi;
   - dengan filter: pesan kosong beserta tombol "Reset filter".
9. Daftar dimuat bertahap (infinite scroll per 50 transaksi). Ringkasan total tetap dihitung dari seluruh transaksi periode tersebut, bukan hanya yang sudah tampil.
10. Menekan satu baris transaksi membuka detail transaksi (E02-US04).
11. Daftar hanya menampilkan transaksi milik pengguna yang login.
12. Daftar transaksi dapat dibuka dari halaman lain dengan filter bulan dan kategori yang sudah terpasang, misalnya saat pengguna menekan kategori di grafik Laporan (E04-US02). Filter yang aktif tetap terlihat sebagai chip dan bisa di-reset. Filter juga tetap terpasang saat halaman di-refresh.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e02-us03--daftar-transaksi---design.md`
- Testing: `e02-us03--daftar-transaksi---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-002, FEAT-004)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us03--daftar-transaksi---story.md
-->
