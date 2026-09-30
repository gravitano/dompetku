# USER STORY

## Story Metadata

### Title
E02-US04 — Ubah dan hapus transaksi

### Priority
High (Must Have, FEAT-005)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Membuka detail transaksi yang sudah saya catat, lalu mengubah isinya atau menghapusnya

### So that
Catatan keuangan saya tetap akurat walaupun saya salah ketik nominal, salah pilih kategori, atau mencatat transaksi ganda

### Business Value
Salah input pasti terjadi, apalagi saat pengguna mencatat dengan cepat dari HP. Jika kesalahan tidak bisa diperbaiki, ringkasan, anggaran, dan laporan menjadi tidak akurat, dan pengguna berhenti mempercayai datanya. Kemampuan memperbaiki catatan dengan mudah menjaga kualitas data yang menjadi dasar BO-03 (pengeluaran terkendali).

## 2. Delivery Context

### Assumptions
- Mengubah transaksi memakai form yang sama dengan E02-US01/E02-US02, sudah terisi dengan data transaksi.
- Jenis transaksi (Pengeluaran/Pemasukan) boleh diubah. Jika jenis diubah, kategori harus dipilih ulang.
- Hapus bersifat permanen (tidak ada recycle bin di MVP), sehingga wajib ada konfirmasi.

### Dependencies
- E02-US01, E02-US02: form transaksi.
- E02-US03: daftar transaksi sebagai pintu masuk ke detail.

### Out of Scope
- Riwayat perubahan (audit trail) transaksi.
- Undo setelah hapus dan hapus massal.
- Duplikasi transaksi.

## 3. Acceptance

### Acceptance Criteria
1. Menekan baris transaksi di daftar (tab Transaksi maupun transaksi terbaru di Beranda) membuka **Detail Transaksi**, yang berisi form terisi dengan jenis, nominal, kategori, tanggal, dan catatan.
2. Pengguna dapat mengubah field mana pun dengan aturan validasi yang sama dengan E02-US01:
   - 0 < nominal ≤ Rp 1.000.000.000;
   - tanggal tidak melebihi hari ini;
   - catatan maksimal 100 karakter.
3. Jika jenis transaksi diubah, pilihan kategori dikosongkan dan pengguna wajib memilih kategori jenis yang baru.
4. Tombol **Simpan perubahan** hanya aktif jika ada perubahan data.
5. Setelah perubahan tersimpan:
   - muncul notifikasi "Perubahan tersimpan";
   - daftar transaksi dan total ringkasan langsung diperbarui;
   - jika tanggal dipindah ke bulan lain, transaksi berpindah ke bulan tersebut.
6. Transaksi dengan kategori yang sudah diarsipkan tetap menampilkan kategori tersebut (ditandai "Diarsipkan"). Pengguna boleh menyimpan tanpa mengganti kategori, tetapi kategori terarsip tidak muncul sebagai pilihan untuk kategori baru.
7. Pengguna dapat menghapus transaksi melalui tombol **Hapus**. Sebelum dihapus, muncul konfirmasi "Hapus transaksi ini? Tindakan ini tidak bisa dibatalkan." yang menampilkan nominal dan kategorinya.
8. Setelah dihapus:
   - muncul notifikasi "Transaksi dihapus";
   - detail tertutup;
   - transaksi hilang dari daftar dan total ringkasan diperbarui.
9. Jika menutup detail yang sudah diubah tanpa menyimpan, muncul konfirmasi "Buang perubahan?".
10. Jika penyimpanan atau penghapusan gagal, muncul pesan error dan data tidak berubah.
11. Pengguna hanya dapat membuka, mengubah, dan menghapus transaksi miliknya sendiri. Membuka tautan transaksi milik pengguna lain menampilkan halaman "Transaksi tidak ditemukan".

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e02-us04--ubah-hapus-transaksi---design.md`
- Testing: `e02-us04--ubah-hapus-transaksi---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-002, FEAT-005)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us04--ubah-hapus-transaksi---story.md
-->
