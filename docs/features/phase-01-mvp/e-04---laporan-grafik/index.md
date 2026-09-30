# EPIC INDEX

## Epic Metadata

### Epic Title
EPIC-004 — Laporan & Grafik

### Priority
High (Must Have)

### Owner
Warsono

### Target Release / Timeline
Sprint 2 (22 Okt – 4 Nov 2026), milestone M4 UAT Complete & M5 Go-Live

## 1. Overview

### Epic Summary
Mencatat transaksi saja belum cukup kalau pengguna tetap tidak bisa melihat gambaran besarnya. Epic ini mengubah data transaksi (EPIC-002) dan anggaran (EPIC-003) menjadi ringkasan bulanan, grafik pengeluaran per kategori, dan tren antar bulan. Dengan begitu pengguna langsung tahu ke mana uangnya habis tanpa perlu menghitung manual.

### Business Objective
Menjawab pain point utama BRD, yaitu "tidak tahu uang habis ke mana". Epic ini juga mendukung BO-03 (pengeluaran bulanan tidak melebihi anggaran), karena pengguna bisa melihat posisi keuangannya setiap saat. Dashboard yang informatif juga mendorong pengguna kembali setiap hari (BO-01).

### Target Users
- Individu yang ingin memantau keuangan pribadinya (pengguna utama)

### Success Metrics
- Beranda (dashboard) tampil dalam waktu < 2 detik.
- Pengguna dapat menjawab "kategori apa yang paling banyak menghabiskan uang bulan ini?" dalam 1 langkah dari tab Laporan.

## 2. Scope

### Scope / Key Capabilities
- Dashboard ringkasan bulan berjalan: pemasukan, pengeluaran, selisih, ringkasan anggaran, dan transaksi terbaru (FEAT-010)
- Grafik pengeluaran per kategori per bulan, beserta daftar nominal dan persentase (FEAT-011)
- Grafik tren pemasukan vs pengeluaran 6 bulan terakhir (FEAT-012, Should Have)

### Out of Scope
- Ekspor laporan (PDF/CSV/Excel)
- Laporan per periode custom (mingguan, rentang tanggal bebas) dan laporan tahunan
- Perbandingan antar kategori lintas bulan dan prediksi/insight otomatis
- Detail indikator anggaran per kategori (EPIC-003)

## 3. Delivery Considerations

### Assumptions
- Periode laporan = bulan kalender zona Asia/Jakarta.
- Semua nominal dalam Rupiah tanpa desimal. Angka besar di grafik boleh disingkat (misal "Rp 1,2 jt"), tetapi tooltip dan daftar selalu menampilkan nominal lengkap.
- Kategori yang sudah diarsipkan tetap muncul di laporan bulan yang memiliki transaksi dengan kategori tersebut.

### Dependencies
- EPIC-001 Akun & Keamanan: pengguna harus login.
- EPIC-002 Pencatatan Transaksi: sumber data seluruh laporan. Tap kategori di grafik diarahkan ke daftar transaksi terfilter (E02-US03).
- EPIC-003 Anggaran: sumber data ringkasan anggaran di dashboard.
- ITA: index transaksi `(user_id, transaction_date)` dan `(user_id, category_id, transaction_date)` (`docs/project/03-ITA.md` §4.2).

### Risks
- Grafik yang padat sulit dibaca di layar HP. Mitigasinya, daftar angka selalu ditampilkan di bawah grafik.
- Target < 2 detik bisa terlewati jika agregasi tidak memakai index yang tepat.
- FEAT-012 adalah Should Have dan menjadi buffer. Fitur ini bisa digeser ke Phase 2 jika Sprint 2 padat (PEP R01).

## 4. Execution

### User Stories
| Story | Story File | Design File | Testing File | PM Sync |
|-------|------------|-------------|--------------|---------|
| E04-US01 Dashboard ringkasan bulanan | [`e04-us01--dashboard-ringkasan-bulanan---story.md`](e04-us01--dashboard-ringkasan-bulanan---story.md) | [`e04-us01--dashboard-ringkasan-bulanan---design.md`](e04-us01--dashboard-ringkasan-bulanan---design.md) | [`e04-us01--dashboard-ringkasan-bulanan---testing.md`](e04-us01--dashboard-ringkasan-bulanan---testing.md) | Not synced |
| E04-US02 Grafik pengeluaran per kategori | [`e04-us02--grafik-pengeluaran-kategori---story.md`](e04-us02--grafik-pengeluaran-kategori---story.md) | [`e04-us02--grafik-pengeluaran-kategori---design.md`](e04-us02--grafik-pengeluaran-kategori---design.md) | [`e04-us02--grafik-pengeluaran-kategori---testing.md`](e04-us02--grafik-pengeluaran-kategori---testing.md) | Not synced |
| E04-US03 Grafik tren bulanan *(Should Have)* | [`e04-us03--grafik-tren-bulanan---story.md`](e04-us03--grafik-tren-bulanan---story.md) | [`e04-us03--grafik-tren-bulanan---design.md`](e04-us03--grafik-tren-bulanan---design.md) | [`e04-us03--grafik-tren-bulanan---testing.md`](e04-us03--grafik-tren-bulanan---testing.md) | Not synced |

### Acceptance Criteria / Epic Completion Criteria
- Setelah login, pengguna langsung melihat ringkasan pemasukan, pengeluaran, dan selisih bulan berjalan dalam waktu < 2 detik.
- Pengguna dapat melihat pengeluaran per kategori untuk bulan mana pun yang dipilih, lengkap dengan nominal dan persentase.
- Semua angka di laporan sama dengan jumlah transaksi pengguna pada periode yang sama, dan tidak ada data pengguna lain yang ikut terhitung.

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-04---laporan-grafik/index.md

RELATED FILES:
- e04-us01--dashboard-ringkasan-bulanan---story.md / ---design.md / ---testing.md
- e04-us02--grafik-pengeluaran-kategori---story.md / ---design.md / ---testing.md
- e04-us03--grafik-tren-bulanan---story.md / ---design.md / ---testing.md
-->
