# USER STORY

## Story Metadata

### Title
E04-US02 — Grafik pengeluaran per kategori

### Priority
High (Must Have, FEAT-011)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Melihat grafik dan daftar pengeluaran per kategori untuk bulan yang saya pilih

### So that
Saya tahu kategori mana yang paling banyak menghabiskan uang dan bisa memutuskan di mana harus berhemat

### Business Value
Story ini langsung menjawab pain point utama di BRD, yaitu "tidak tahu uang habis ke mana". Dengan melihat porsi tiap kategori, pengguna bisa mengambil keputusan konkret, misalnya mengurangi jajan atau menurunkan anggaran hiburan. Hal ini mendukung BO-03 (pengeluaran terkendali).

## 2. Delivery Context

### Assumptions
- Periode = bulan kalender zona Asia/Jakarta. Saat tab Laporan dibuka, bulan default adalah bulan berjalan.
- Hanya transaksi bertipe pengeluaran yang dihitung di grafik ini.
- Kategori yang sudah diarsipkan tetap muncul di bulan yang memiliki transaksi dengan kategori tersebut.
- Persentase dibulatkan ke 1 desimal (contoh: 12,5%).

### Dependencies
- E01 Login & logout (FEAT-002).
- EPIC-002 Pencatatan Transaksi: sumber data pengeluaran.
- E02-US03 Daftar transaksi dengan filter (FEAT-004): tujuan saat pengguna tap kategori.

### Out of Scope
- Grafik pemasukan per kategori.
- Periode selain bulanan (mingguan, rentang tanggal custom, tahunan).
- Perbandingan kategori dengan anggarannya (EPIC-003).
- Ekspor/unduh grafik.

## 3. Acceptance

### Acceptance Criteria
1. Tab **Laporan** tersedia di bottom nav (HP) dan sidebar (desktop). Saat dibuka, laporan menampilkan bulan berjalan.
2. Pengguna dapat berpindah bulan dengan tombol **◀** (bulan sebelumnya) dan **▶** (bulan berikutnya). Tombol ▶ nonaktif saat bulan yang dipilih adalah bulan berjalan.
3. Laporan menampilkan **total pengeluaran** bulan terpilih dan **donut chart** porsi pengeluaran per kategori.
4. Di bawah grafik selalu tampil **daftar kategori** yang diurutkan dari nominal terbesar. Setiap baris berisi ikon/warna kategori, nama kategori, nominal lengkap (contoh: `Rp 1.000.000`), dan persentase terhadap total pengeluaran bulan itu.
5. Hanya kategori yang punya pengeluaran di bulan terpilih yang muncul. Kategori yang sudah diarsipkan tetap muncul jika ada transaksinya di bulan tersebut.
6. Jumlah semua nominal di daftar sama dengan total pengeluaran, dan jumlah persentasenya ≈ 100% (selisih pembulatan maksimal 0,1%).
7. Tap/klik kategori (di grafik atau daftar) membuka **daftar transaksi** yang sudah terfilter kategori dan bulan tersebut (E02-US03).
8. Jika bulan terpilih tidak punya pengeluaran, grafik diganti empty state "Belum ada pengeluaran di bulan ini".
9. Informasi tidak hanya dibedakan dengan warna. Nama kategori, nominal, dan persentase selalu tampil sebagai teks di daftar.
10. Laporan hanya menghitung transaksi milik pengguna yang sedang login.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e04-us02--grafik-pengeluaran-kategori---design.md`
- Testing: `e04-us02--grafik-pengeluaran-kategori---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-004, FEAT-011, BO-03)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us02--grafik-pengeluaran-kategori---story.md
-->
