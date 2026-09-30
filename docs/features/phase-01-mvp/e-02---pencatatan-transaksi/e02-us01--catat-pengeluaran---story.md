# USER STORY

## Story Metadata

### Title
E02-US01 — Catat pengeluaran

### Priority
High (Must Have, FEAT-003)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Mencatat pengeluaran (nominal, kategori, tanggal, dan catatan) dengan cepat dari HP maupun desktop

### So that
Semua pengeluaran saya, termasuk yang kecil, tercatat di satu tempat dan saya tahu ke mana uang saya habis

### Business Value
Pencatatan pengeluaran adalah aksi yang paling sering dilakukan di DompetKu dan menjadi sumber data untuk anggaran dan laporan. Jika pencatatan lambat atau merepotkan, pengguna berhenti mencatat. Karena itu story ini menjadi penentu utama tercapainya BO-01 (mencatat secara rutin) dan BO-02 (< 15 detik per transaksi).

## 2. Delivery Context

### Assumptions
- Pengguna sudah memiliki kategori pengeluaran bawaan (misalnya Makan & Minum, Transportasi, Belanja, Tagihan, Hiburan, Kesehatan, Lainnya).
- Satu transaksi = satu nominal dengan satu kategori (tidak ada split kategori).
- Nominal dalam Rupiah tanpa desimal.

### Dependencies
- E01 Login & logout (FEAT-002): pengguna harus login.
- Kategori bawaan dibuat otomatis saat registrasi (FEAT-001).

### Out of Scope
- Mencatat pemasukan (story terpisah di epic ini).
- Mengubah dan menghapus transaksi (FEAT-005).
- Membuat kategori custom dari form ini (FEAT-006).
- Peringatan anggaran setelah menyimpan (FEAT-009, EPIC-003).
- Foto struk, transaksi berulang, dan multi dompet.

## 3. Acceptance

### Acceptance Criteria
1. Dari halaman utama, pengguna dapat membuka form "Catat Pengeluaran" dengan satu kali tap/klik.
2. Form berisi **Nominal** (wajib), **Kategori** (wajib, hanya kategori pengeluaran milik pengguna), **Tanggal** (wajib, default hari ini), dan **Catatan** (opsional).
3. Nominal ditampilkan dengan format Rupiah dan pemisah ribuan saat diketik (contoh: `Rp 25.000`).
4. Nominal harus lebih dari 0 dan tidak lebih dari Rp 1.000.000.000. Jika tidak sesuai, muncul pesan di bawah field dan transaksi tidak tersimpan.
5. Tanggal tidak boleh melebihi hari ini.
6. Catatan maksimal 100 karakter.
7. Jika ada field yang tidak valid, data lain yang sudah diisi tidak hilang.
8. Setelah berhasil disimpan, pengguna melihat notifikasi "Pengeluaran tersimpan", form tertutup, dan transaksi baru langsung muncul di daftar transaksi. Total pengeluaran bulan berjalan juga ikut bertambah.
9. Tombol simpan tidak bisa ditekan dua kali selama proses penyimpanan, sehingga tidak ada transaksi ganda.
10. Jika penyimpanan gagal (misalnya koneksi putus), muncul pesan error, data di form tetap ada, dan pengguna bisa mencoba lagi.
11. Pengeluaran yang dicatat hanya dapat dilihat oleh pengguna yang mencatatnya.
12. Pengguna yang sudah terbiasa dapat mencatat satu pengeluaran (nominal + kategori, tanggal default) dalam waktu < 15 detik di HP.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e02-us01--catat-pengeluaran---design.md`
- Testing: `e02-us01--catat-pengeluaran---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-002, FEAT-003, BO-01, BO-02)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us01--catat-pengeluaran---story.md
-->
