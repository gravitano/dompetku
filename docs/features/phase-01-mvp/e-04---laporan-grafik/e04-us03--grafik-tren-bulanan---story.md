# USER STORY

## Story Metadata

### Title
E04-US03 — Grafik tren bulanan

### Priority
Medium (Should Have, FEAT-012). Menjadi buffer Sprint 2 dan boleh digeser ke Phase 2 (PEP §5).

### PM Sync
Not synced

## 1. User Need

### As a
Pengguna DompetKu yang sudah login

### I want
Melihat perbandingan pemasukan dan pengeluaran saya selama 6 bulan terakhir dalam satu grafik

### So that
Saya tahu apakah pengeluaran saya makin terkendali atau justru makin boros dari bulan ke bulan

### Business Value
Grafik per kategori (E04-US02) hanya menunjukkan satu bulan. Tren 6 bulan membantu pengguna menilai apakah kebiasaannya membaik, yang menjadi ukuran nyata BO-03 (pengeluaran terkendali). Melihat progres juga memberi motivasi untuk terus mencatat (BO-01).

## 2. Delivery Context

### Assumptions
- Rentang = 6 bulan kalender terakhir termasuk bulan berjalan (contoh: Mei–Oktober 2026 jika sekarang Oktober 2026), zona Asia/Jakarta.
- Rata-rata pengeluaran = total pengeluaran 6 bulan ÷ 6, termasuk bulan tanpa data (dihitung 0) dan bulan berjalan.
- Rentang tren selalu 6 bulan terakhir dan tidak ikut berubah saat pengguna memilih bulan lain di selector E04-US02.

### Dependencies
- E01 Login & logout (FEAT-002).
- EPIC-002 Pencatatan Transaksi: sumber data pemasukan dan pengeluaran.
- E04-US02 Grafik pengeluaran per kategori: grafik tren ditempatkan di bagian bawah tab Laporan yang sama.

### Out of Scope
- Memilih rentang selain 6 bulan (3 bulan, 12 bulan, tahunan).
- Tren per kategori.
- Prediksi atau insight otomatis (misal "pengeluaranmu naik 20%").
- Perbandingan tren dengan anggaran (EPIC-003).

## 3. Acceptance

### Acceptance Criteria
1. Di bagian bawah tab **Laporan** tampil bagian **"Tren 6 bulan"** berisi grafik batang berpasangan: pemasukan (hijau) dan pengeluaran (merah) untuk setiap bulan dari 6 bulan terakhir, termasuk bulan berjalan.
2. Sumbu horizontal menampilkan nama bulan singkat (contoh: "Mei", "Jun", …, "Okt"). Sumbu vertikal menampilkan nominal yang disingkat (contoh: "Rp 1,5 jt").
3. Tap (HP) atau hover (desktop) pada batang bulan menampilkan tooltip berisi nama bulan lengkap, pemasukan, dan pengeluaran dalam format Rupiah lengkap (contoh: `Rp 1.500.000`).
4. Bulan tanpa transaksi tetap tampil di grafik dengan nilai Rp 0.
5. Di bawah grafik tampil **"Rata-rata pengeluaran per bulan"** untuk 6 bulan tersebut dalam format Rupiah lengkap.
6. Grafik memiliki legenda teks "Pemasukan" dan "Pengeluaran", sehingga informasi tidak hanya dibedakan dengan warna.
7. Jika pengguna memiliki transaksi di kurang dari 2 bulan (dari 6 bulan tersebut), grafik tetap tampil dan disertai pesan "Tren akan lebih terlihat setelah ada data minimal 2 bulan".
8. Grafik hanya menghitung transaksi milik pengguna yang sedang login.

### Definition of Done
- [ ] Acceptance criteria are met.
- [ ] Story design is reviewed.
- [ ] Story testing scenarios are reviewed.
- [ ] Product Owner accepts the story.

## 4. Traceability

### Related Files
- Design: `e04-us03--grafik-tren-bulanan---design.md`
- Testing: `e04-us03--grafik-tren-bulanan---testing.md`
- Epic Index: `index.md`
- BRD: `docs/project/01-BRD.md` (EPIC-004, FEAT-012, BO-01, BO-03)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us03--grafik-tren-bulanan---story.md
-->
