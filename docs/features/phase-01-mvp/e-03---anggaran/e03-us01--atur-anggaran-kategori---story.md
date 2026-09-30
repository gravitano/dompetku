# USER STORY

## Story Metadata

### Title
E03-US01 — Atur anggaran kategori

### Priority
High (Must Have, FEAT-007)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Menetapkan, mengubah, dan menghapus anggaran bulanan untuk setiap kategori pengeluaran, serta menyalin anggaran dari bulan lalu

### So that
Saya punya batas pengeluaran yang jelas per kategori setiap bulan dan bisa mengendalikan pengeluaran agar tidak over-budget

### Business Value
Anggaran per kategori adalah alat utama untuk mencapai BO-03 (pengeluaran bulanan tidak melebihi anggaran). Tanpa batas yang tertulis, pengguna tidak punya acuan untuk menahan pengeluaran. Fitur salin dari bulan lalu menjaga kebiasaan ini tetap ringan, karena pengguna tidak perlu mengisi ulang setiap bulan.

## 2. Delivery Context

### Assumptions
- Periode anggaran adalah bulan kalender zona Asia/Jakarta.
- Anggaran hanya berlaku untuk kategori pengeluaran yang aktif (tidak diarsipkan).
- Satu kategori hanya bisa punya satu anggaran per bulan.
- Anggaran bulan yang sudah lewat hanya bisa dilihat, tidak bisa diubah (lihat Open UX Questions di file design).

### Dependencies
- E01 Login & logout (FEAT-002): pengguna harus login.
- Kategori pengeluaran bawaan tersedia untuk setiap akun (FEAT-001, EPIC-002).

### Out of Scope
- Tampilan pemakaian anggaran (terpakai, sisa, persentase) — E03-US02.
- Peringatan anggaran — E03-US03.
- Anggaran untuk kategori pemasukan, anggaran total tanpa kategori, dan rollover sisa anggaran.
- Periode anggaran selain bulan kalender.

## 3. Acceptance

### Acceptance Criteria
1. Pengguna dapat membuka halaman **Anggaran** dari tab "Anggaran" di bottom nav (HP) atau sidebar (desktop).
2. Halaman Anggaran menampilkan bulan berjalan secara default. Pengguna dapat berpindah bulan dengan tombol ◀ dan ▶. Tombol ▶ nonaktif di bulan berikutnya setelah bulan berjalan, jadi maksimal 1 bulan ke depan.
3. Halaman menampilkan semua kategori pengeluaran aktif milik pengguna, masing-masing dengan nominal anggarannya atau label "Belum diatur".
4. Pengguna dapat mengatur anggaran untuk kategori yang belum punya anggaran. Nominal wajib > 0 dan ≤ Rp 1.000.000.000, ditampilkan dengan format Rupiah (contoh `Rp 1.500.000`).
5. Pengguna dapat mengubah nominal anggaran yang sudah ada.
6. Pengguna dapat menghapus anggaran suatu kategori setelah konfirmasi, sehingga kategori tersebut kembali "Belum diatur".
7. Satu kategori hanya memiliki satu anggaran per bulan. Mengatur ulang berarti mengubah anggaran yang ada, bukan menambah baru.
8. Total anggaran bulan tersebut (jumlah semua anggaran kategori) ditampilkan di bagian atas halaman dan langsung diperbarui setiap kali anggaran diatur, diubah, atau dihapus.
9. Jika bulan yang dibuka belum punya anggaran sama sekali dan bulan sebelumnya punya, tampil tombol **"Salin dari bulan lalu"**. Menekannya menyalin semua anggaran bulan sebelumnya untuk kategori yang masih aktif, lalu menampilkan notifikasi "Anggaran disalin dari [bulan]".
10. Anggaran untuk bulan yang sudah lewat hanya dapat dilihat (read-only): tidak ada tombol atur, ubah, hapus, atau salin.
11. Setelah anggaran berhasil disimpan, pengguna melihat notifikasi "Anggaran tersimpan". Jika gagal, muncul pesan error dan nominal yang diisi tetap ada.
12. Anggaran hanya dapat dilihat dan diubah oleh pemiliknya.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e03-us01--atur-anggaran-kategori---design.md`
- Testing: `e03-us01--atur-anggaran-kategori---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-003, FEAT-007, BO-03)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-03---anggaran/e03-us01--atur-anggaran-kategori---story.md
-->
