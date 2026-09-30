# USER STORY

## Story Metadata

### Title
E04-US01 — Dashboard ringkasan bulanan

### Priority
High (Must Have, FEAT-010)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Langsung melihat ringkasan keuangan bulan ini (pemasukan, pengeluaran, selisih, pemakaian anggaran, dan transaksi terbaru) begitu membuka aplikasi

### So that
Dalam sekali lihat saya tahu posisi keuangan saya bulan ini dan apakah pengeluaran saya masih terkendali

### Business Value
Beranda adalah layar yang paling sering dilihat pengguna. Ringkasan yang langsung terlihat menjawab pertanyaan "uang saya habis ke mana dan masih aman atau tidak" tanpa perlu menghitung manual. Beranda juga menjadi titik awal untuk mencatat transaksi (FAB "+"), sehingga mendukung BO-01 (mencatat rutin) dan BO-03 (pengeluaran terkendali).

## 2. Delivery Context

### Assumptions
- Bulan berjalan dihitung berdasarkan bulan kalender zona Asia/Jakarta.
- Selisih = total pemasukan − total pengeluaran bulan berjalan.
- Ringkasan anggaran di Beranda hanya menampilkan total. Detail per kategori ada di tab Anggaran (EPIC-003).

### Dependencies
- E01 Login & logout (FEAT-002): Beranda adalah halaman pertama setelah login.
- E02-US01 Catat pengeluaran dan story catat pemasukan (EPIC-002): sumber data ringkasan dan FAB "+".
- E02 daftar transaksi (E02-US03): tujuan link "Lihat semua".
- EPIC-003 Anggaran: sumber data total anggaran dan total terpakai.

### Out of Scope
- Memilih bulan lain di Beranda. Laporan bulan lain dibuka dari tab Laporan (E04-US02).
- Grafik di Beranda (grafik ada di tab Laporan).
- Detail anggaran per kategori dan peringatan anggaran (EPIC-003).
- Mengubah atau menghapus transaksi langsung dari Beranda (FEAT-005).

## 3. Acceptance

### Acceptance Criteria
1. Setelah login, pengguna diarahkan ke **Beranda**. Di HP, tab Beranda aktif di bottom nav, sedangkan di desktop menu Beranda aktif di sidebar.
2. Beranda menampilkan nama bulan berjalan (contoh: "Oktober 2026") dan kartu ringkasan berisi **Total Pemasukan**, **Total Pengeluaran**, dan **Selisih** bulan berjalan dalam format Rupiah (contoh: `Rp 25.000`).
3. Selisih ditampilkan hijau dengan tanda "+" jika positif, merah dengan tanda "−" jika negatif, dan netral jika nol.
4. Jika pengguna sudah mengatur anggaran bulan ini, Beranda menampilkan ringkasan anggaran berupa total terpakai vs total anggaran (contoh: "Rp 1.250.000 dari Rp 3.000.000") dengan progress bar, serta link **"Lihat anggaran"** ke tab Anggaran. "Total terpakai" dihitung dari seluruh pengeluaran bulan berjalan, termasuk kategori tanpa anggaran, sama dengan definisi di E03-US02.
4a. Beranda menyediakan tempat untuk banner peringatan anggaran di atas kartu ringkasan. Banner muncul jika ada kategori yang hampir habis atau terlampaui (aturannya di E03-US03).
5. Jika pengguna belum mengatur anggaran bulan ini, bagian anggaran menampilkan ajakan "Atur anggaran bulan ini" yang mengarah ke tab Anggaran.
6. Beranda menampilkan **5 transaksi terbaru** (urut tanggal transaksi terbaru, lalu waktu dicatat terbaru), masing-masing berisi ikon kategori, catatan atau nama kategori, tanggal, dan nominal. Pengeluaran ditandai "−", pemasukan ditandai "+".
7. Link **"Lihat semua"** membuka tab Transaksi.
8. Tombol melayang **"+"** tersedia di Beranda untuk mencatat transaksi (EPIC-002).
9. Setelah pengguna mencatat transaksi baru, angka ringkasan dan daftar transaksi terbaru langsung ter-update tanpa perlu refresh manual.
10. Pengguna baru tanpa transaksi melihat empty state "Belum ada transaksi, catat pengeluaran pertamamu" dengan tombol **"Catat pengeluaran"** yang membuka form catat pengeluaran. Kartu ringkasan tetap tampil dengan nilai Rp 0.
11. Beranda tampil lengkap dalam waktu < 2 detik pada koneksi normal.
12. Semua angka di Beranda hanya menghitung transaksi dan anggaran milik pengguna yang sedang login.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e04-us01--dashboard-ringkasan-bulanan---design.md`
- Testing: `e04-us01--dashboard-ringkasan-bulanan---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-004, FEAT-010, BO-01, BO-03, NFR Performance)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us01--dashboard-ringkasan-bulanan---story.md
-->
