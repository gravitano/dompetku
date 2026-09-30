# USER STORY

## Story Metadata

### Title
E03-US03 — Peringatan anggaran

### Priority
Medium (Should Have, FEAT-009)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah mengatur anggaran bulan berjalan

### I want
Mendapat peringatan di dalam aplikasi saat anggaran suatu kategori hampir habis (≥ 80%) atau sudah terlampaui (≥ 100%)

### So that
Saya langsung sadar saat pengeluaran mendekati batas, tanpa harus rutin membuka halaman Anggaran, dan bisa segera mengerem pengeluaran

### Business Value
Indikator pemakaian (E03-US02) hanya membantu jika pengguna membukanya. Peringatan yang muncul tepat saat pengeluaran dicatat membawa informasi ke pengguna pada momen yang paling relevan, sehingga peluang mencapai BO-03 lebih besar. Fitur ini Should Have: jika waktu Sprint 2 tidak cukup, fitur ini digeser ke Phase 2 tanpa mengganggu fungsi anggaran inti.

## 2. Delivery Context

### Assumptions
- Peringatan hanya berupa tampilan di dalam aplikasi (toast dan banner). Tidak ada email atau push notification.
- Peringatan hanya berlaku untuk **bulan berjalan** dan hanya untuk kategori yang punya anggaran.
- Status kategori memakai tiga level yang sama dengan E03-US02: **Aman** (< 80%), **Hampir habis** (80–99%), dan **Terlampaui** (≥ 100%).
- **Aturan kapan toast muncul:** status kategori dicek setiap kali pengeluaran disimpan. Toast peringatan hanya muncul jika status kategori tersebut **naik level** dibanding sebelum disimpan. Jika status tetap atau turun, tidak ada toast. Jika naik langsung dari Aman ke Terlampaui, hanya peringatan Terlampaui yang ditampilkan.

### Dependencies
- E03-US01 Atur anggaran kategori dan E03-US02 Indikator pemakaian anggaran.
- E02-US01 Catat pengeluaran (form dan toast "Pengeluaran tersimpan") serta FEAT-005 Ubah transaksi.
- Halaman Beranda (EPIC-004, FEAT-010) sebagai tempat banner.

### Out of Scope
- Email, push notification, dan notifikasi terjadwal (misalnya ringkasan mingguan).
- Pengaturan ambang peringatan oleh pengguna (ambang tetap 80% dan 100%).
- Peringatan untuk bulan lampau atau bulan depan.
- Riwayat/daftar notifikasi.

## 3. Acceptance

### Acceptance Criteria
1. Setelah pengeluaran bulan berjalan disimpan (E02-US01) dan membuat kategorinya naik dari Aman ke **Hampir habis**, muncul toast peringatan kuning setelah toast "Pengeluaran tersimpan", misalnya "⚠ Anggaran Makan & Minum sudah terpakai 85%. Sisa Rp 225.000."
2. Setelah pengeluaran bulan berjalan disimpan dan membuat kategorinya naik ke **Terlampaui**, muncul toast peringatan merah, misalnya "⛔ Anggaran Makan & Minum terlampaui. Lebih Rp 180.000."
3. Jika satu penyimpanan membuat kategori naik langsung dari Aman ke Terlampaui, hanya toast Terlampaui yang muncul.
4. Jika status kategori tidak berubah atau turun setelah penyimpanan, tidak ada toast peringatan. Contohnya: sudah Hampir habis dan tetap Hampir habis, atau sudah Terlampaui dan bertambah lagi.
5. Aturan yang sama berlaku saat pengguna mengubah pengeluaran (FEAT-005) sehingga status kategori naik level.
6. Toast peringatan tidak muncul untuk pengeluaran bertanggal di luar bulan berjalan dan untuk kategori tanpa anggaran.
7. Toast peringatan memiliki tautan **"Lihat anggaran"** yang membuka halaman Anggaran bulan berjalan.
8. Selama ada kategori dengan status Hampir habis atau Terlampaui di bulan berjalan, **Beranda** menampilkan banner ringkas, misalnya "2 kategori perlu perhatian: 1 terlampaui, 1 hampir habis", dengan tautan ke halaman Anggaran.
9. Selama kondisi yang sama, halaman **Anggaran** (bulan berjalan) menampilkan banner di atas kartu ringkasan yang menyebutkan nama kategori yang Hampir habis dan Terlampaui.
10. Banner hilang dengan sendirinya jika tidak ada lagi kategori berstatus Hampir habis atau Terlampaui, misalnya karena anggaran dinaikkan atau transaksi dihapus.
11. Peringatan hanya didasarkan pada anggaran dan transaksi milik pengguna sendiri.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e03-us03--peringatan-anggaran---design.md`
- Testing: `e03-us03--peringatan-anggaran---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-003, FEAT-009, BO-03)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-03---anggaran/e03-us03--peringatan-anggaran---story.md
-->
