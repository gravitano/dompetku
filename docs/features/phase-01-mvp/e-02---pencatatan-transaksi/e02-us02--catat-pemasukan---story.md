# USER STORY

## Story Metadata

### Title
E02-US02 — Catat pemasukan

### Priority
High (Must Have, FEAT-003)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Mencatat pemasukan (nominal, kategori, tanggal, dan catatan) dengan cara yang sama cepatnya seperti mencatat pengeluaran

### So that
Saya bisa melihat selisih antara uang masuk dan uang keluar setiap bulan, lalu menilai apakah pengeluaran saya masih wajar

### Business Value
Tanpa data pemasukan, ringkasan bulanan hanya menampilkan pengeluaran dan pengguna tidak tahu apakah dirinya surplus atau defisit. Pemasukan dicatat dari form yang sama dengan pengeluaran (lewat toggle jenis), sehingga pengguna tidak perlu mempelajari alur baru dan target mencatat < 15 detik (BO-02) tetap berlaku.

## 2. Delivery Context

### Assumptions
- Pemasukan dicatat dari form yang sama dengan E02-US01, dengan toggle **Pengeluaran | Pemasukan** di bagian atas form. Default toggle adalah Pengeluaran karena pengeluaran jauh lebih sering dicatat.
- Pengguna sudah memiliki kategori pemasukan bawaan: Gaji, Bonus, Hadiah, Lainnya.
- Satu transaksi = satu nominal dengan satu kategori. Nominal dalam Rupiah tanpa desimal.

### Dependencies
- E02-US01 Catat pengeluaran: memakai form dan aturan validasi yang sama.
- E01 Login & logout (FEAT-002): pengguna harus login.
- Kategori pemasukan bawaan dibuat otomatis saat registrasi (FEAT-001).

### Out of Scope
- Pemasukan berulang otomatis (misalnya gaji bulanan).
- Mengubah dan menghapus transaksi (E02-US04).
- Membuat kategori pemasukan custom dari form ini (E02-US05).
- Multi dompet / rekening tujuan pemasukan.

## 3. Acceptance

### Acceptance Criteria
1. Di form catat transaksi ada toggle **Pengeluaran | Pemasukan** dengan default Pengeluaran.
2. Saat toggle diubah ke **Pemasukan**:
   - judul form berubah menjadi "Catat Pemasukan";
   - pilihan kategori hanya menampilkan kategori pemasukan milik pengguna;
   - kategori yang sebelumnya dipilih dikosongkan.
3. Nominal dan catatan yang sudah diisi tetap ada saat toggle diubah.
4. Form berisi **Nominal** (wajib), **Kategori** (wajib), **Tanggal** (wajib, default hari ini), dan **Catatan** (opsional), dengan aturan validasi yang sama dengan E02-US01:
   - 0 < nominal ≤ Rp 1.000.000.000;
   - tanggal tidak melebihi hari ini;
   - catatan maksimal 100 karakter.
5. Setelah berhasil disimpan:
   - muncul notifikasi "Pemasukan tersimpan" dan form tertutup;
   - transaksi baru muncul di daftar dengan tanda **+** dan warna hijau;
   - total pemasukan bulan berjalan bertambah.
6. Transaksi pemasukan tidak menambah total pengeluaran.
7. Tombol simpan tidak bisa ditekan dua kali selama proses penyimpanan.
8. Jika penyimpanan gagal, muncul pesan error dan data form tetap ada.
9. Pemasukan yang dicatat hanya dapat dilihat oleh pengguna yang mencatatnya.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e02-us02--catat-pemasukan---design.md`
- Testing: `e02-us02--catat-pemasukan---testing.md`
- Epic Index: `index.md`
- Related story: `e02-us01--catat-pengeluaran---story.md`
- BRD: `docs/project/01-BRD.md` (EPIC-002, FEAT-003, BO-01, BO-02)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us02--catat-pemasukan---story.md
-->
