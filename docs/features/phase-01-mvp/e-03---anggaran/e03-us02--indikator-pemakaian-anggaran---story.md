# USER STORY

## Story Metadata

### Title
E03-US02 — Indikator pemakaian anggaran

### Priority
High (Must Have, FEAT-008)

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login dan sudah mengatur anggaran

### I want
Melihat berapa anggaran yang sudah terpakai, sisanya, dan persentasenya untuk setiap kategori, lengkap dengan warna status

### So that
Saya tahu lebih awal kategori mana yang hampir habis atau sudah lebih, dan bisa menahan pengeluaran sebelum akhir bulan

### Business Value
Anggaran baru berguna jika pengguna bisa melihat posisinya setiap saat. Indikator pemakaian mengubah over-budget dari sesuatu yang baru disadari di akhir bulan menjadi sesuatu yang terlihat sejak awal. Ini mendukung langsung BO-03 (total pengeluaran bulanan ≤ total anggaran).

## 2. Delivery Context

### Assumptions
- Pemakaian anggaran = jumlah transaksi pengeluaran di kategori dan bulan kalender yang sama (zona Asia/Jakarta).
- Anggaran dan kategori diatur melalui E03-US01; transaksi dicatat melalui E02-US01 dan diubah/dihapus melalui FEAT-005.
- Ringkasan total terpakai menghitung **seluruh** pengeluaran bulan tersebut, termasuk kategori tanpa anggaran, karena BO-03 mengukur total pengeluaran bulanan.

### Dependencies
- E03-US01 Atur anggaran kategori: halaman Anggaran dan data anggaran.
- E02-US01 Catat pengeluaran dan FEAT-005 Ubah & hapus transaksi: sumber data pemakaian.

### Out of Scope
- Peringatan saat melewati ambang (toast/banner) — E03-US03.
- Grafik pengeluaran dan ringkasan di Beranda — EPIC-004 Laporan & Grafik.
- Prediksi pengeluaran hingga akhir bulan dan saran penghematan.

## 3. Acceptance

### Acceptance Criteria
1. Di halaman Anggaran, setiap kategori yang punya anggaran menampilkan **terpakai**, **anggaran**, **sisa**, **persentase terpakai**, dan **progress bar**.
2. Warna status per kategori mengikuti aturan berikut:
   - **Hijau:** terpakai < 80% anggaran.
   - **Kuning:** 80% sampai < 100%.
   - **Merah:** ≥ 100%.
3. Persentase ditampilkan sebagai bilangan bulat yang dibulatkan ke bawah (contoh 79,6% → "79%"), sedangkan warna status ditentukan dari nilai sebenarnya.
4. Jika terpakai melebihi anggaran, teks sisa diganti menjadi **"Lebih Rp X"** berwarna merah dan progress bar penuh.
5. Bagian atas halaman menampilkan ringkasan **Total terpakai** vs **Total anggaran** bulan tersebut, beserta sisa atau kelebihannya, dengan aturan warna yang sama.
6. Kategori yang tidak punya anggaran tetapi punya pengeluaran di bulan tersebut ditampilkan di bagian terpisah **"Tanpa anggaran"** beserta jumlah pengeluarannya dan tautan "Atur anggaran".
7. Kategori tanpa anggaran dan tanpa pengeluaran tetap ditampilkan sebagai "Belum diatur" (E03-US01).
8. Angka dan warna langsung diperbarui saat pengguna membuka kembali halaman Anggaran setelah transaksi ditambah, diubah, atau dihapus, tanpa perlu refresh manual.
9. Indikator juga tampil untuk bulan lampau (read-only) sesuai data bulan tersebut.
10. Pengguna hanya melihat pemakaian yang dihitung dari transaksi dan anggaran miliknya sendiri.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e03-us02--indikator-pemakaian-anggaran---design.md`
- Testing: `e03-us02--indikator-pemakaian-anggaran---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-003, FEAT-008, BO-03)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-03---anggaran/e03-us02--indikator-pemakaian-anggaran---story.md
-->
