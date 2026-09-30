# USER STORY

## Story Metadata

### Title
E02-US05 — Kelola kategori

### Priority
Medium (Should Have, FEAT-006)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Menambah kategori sendiri, mengubah nama dan ikonnya, serta mengarsipkan kategori yang tidak lagi saya pakai

### So that
Kategori di DompetKu sesuai dengan kebiasaan belanja saya, sehingga saya bisa mengelompokkan pengeluaran dengan tepat dan tidak semuanya berakhir di "Lainnya"

### Business Value
Kategori bawaan tidak selalu cocok untuk semua orang (misalnya "Kopi", "Hewan Peliharaan", "Cicilan"). Jika kategori tidak cocok, pengguna menumpuk transaksi di "Lainnya" dan laporan per kategori kehilangan makna. Story ini bersifat Should Have: MVP tetap bisa dipakai dengan kategori bawaan, sehingga story ini menjadi buffer yang bisa digeser ke Phase 2 jika waktu Sprint 1 tidak cukup (PEP §5).

## 2. Delivery Context

### Assumptions
- Halaman Kategori diakses dari **menu akun** (kanan atas) → **Kategori**.
- Kategori bawaan boleh diubah nama/ikonnya dan diarsipkan seperti kategori custom.
- Kategori yang **sudah dipakai transaksi** tidak bisa dihapus permanen, hanya diarsipkan. Kategori yang **belum pernah dipakai** boleh dihapus permanen.
- Kategori terarsip tidak muncul sebagai pilihan di form transaksi, tetapi transaksi lama tetap menampilkannya, dan kategori tersebut tetap bisa dipakai sebagai filter (E02-US03).
- Nama kategori unik per jenis (tanpa membedakan huruf besar/kecil), baik untuk kategori aktif maupun terarsip.

### Dependencies
- E01 Registrasi (FEAT-001): kategori bawaan dibuat saat registrasi.
- E02-US01 sampai E02-US04: form dan daftar transaksi yang memakai kategori.
- EPIC-003 Anggaran: perlakuan anggaran untuk kategori terarsip didefinisikan di epic tersebut.

### Out of Scope
- Sub-kategori (kategori bertingkat).
- Mengubah urutan kategori secara manual (drag & drop).
- Memindahkan (merge) transaksi dari satu kategori ke kategori lain.
- Mengubah jenis kategori (pengeluaran ↔ pemasukan) setelah dibuat.
- Membuat kategori langsung dari form transaksi.

## 3. Acceptance

### Acceptance Criteria
1. Pengguna dapat membuka halaman **Kategori** dari menu akun. Halaman ini punya dua tab, **Pengeluaran** dan **Pemasukan**. Masing-masing menampilkan kategori aktif, lalu bagian **Diarsipkan** di bawahnya.
2. Pengguna dapat menambah kategori baru dengan memilih:
   - **Jenis**: sesuai tab yang sedang aktif;
   - **Nama**: wajib, 1–30 karakter;
   - **Ikon**: wajib, dipilih dari daftar ikon yang tersedia.
3. Nama kategori harus unik per jenis, tanpa membedakan huruf besar/kecil. Jika nama sudah dipakai, muncul pesan "Nama kategori sudah ada".
4. Pengguna dapat mengubah nama dan ikon kategori. Perubahan langsung terlihat di semua transaksi yang memakai kategori tersebut.
5. Pengguna dapat mengarsipkan kategori aktif. Kategori terarsip:
   - tidak muncul lagi sebagai pilihan di form catat/ubah transaksi;
   - tetap tampil di transaksi lama;
   - tetap tersedia di filter daftar transaksi.
6. Kategori terarsip dapat diaktifkan kembali.
7. Kategori terakhir yang masih aktif pada suatu jenis tidak bisa diarsipkan, dan muncul pesan "Minimal harus ada 1 kategori aktif".
8. Kategori yang belum pernah dipakai transaksi dapat dihapus permanen setelah konfirmasi. Untuk kategori yang sudah dipakai, opsi hapus tidak tersedia dan diganti dengan opsi Arsipkan beserta penjelasan singkatnya.
9. Setiap aksi yang berhasil (tambah, ubah, arsipkan, aktifkan kembali, hapus) menampilkan notifikasi yang sesuai. Aksi yang gagal menampilkan pesan error tanpa mengubah data.
10. Kategori milik seorang pengguna tidak terlihat dan tidak bisa diubah oleh pengguna lain.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e02-us05--kelola-kategori---design.md`
- Testing: `e02-us05--kelola-kategori---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-002, FEAT-006)
- ITA: `docs/project/03-ITA.md` §4.2 (catatan desain kategori & arsip)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us05--kelola-kategori---story.md
-->
