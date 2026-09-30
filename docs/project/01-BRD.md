---
project: DompetKu
project_code: DMK
client: Personal
doc_type: brd
status: draft
language: id
created: 2026-09-30
updated: 2026-09-30
---

# BUSINESS REQUIREMENTS DOCUMENT
## DompetKu

---

| Attribute | Value |
|-----------|-------|
| Document ID | BRD-DMK-001 |
| Version | 1.0 |
| Status | Draft |
| Author | Warsono |
| Created | 2026-09-30 |
| Last Updated | 2026-09-30 |

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-30 | Warsono | Versi awal |

---

## 1. Executive Summary

### 1.1 Latar Belakang

Banyak orang tidak tahu ke mana uang mereka habis setiap bulan. Pengeluaran harian yang kecil-kecil jarang dicatat, sehingga di akhir bulan sulit melacak ke mana saja uang digunakan. Kalaupun ada yang dicatat, catatannya tersebar di spreadsheet, aplikasi notes, struk belanja, atau hanya diingat-ingat. Catatan seperti ini tidak bisa diringkas dengan cepat.

Karena tidak ada batas pengeluaran per kategori yang jelas dan terpantau, pengeluaran sering melebihi rencana (over-budget). Hal ini baru disadari setelah terlambat, biasanya menjelang akhir bulan.

### 1.2 Solusi yang Diusulkan

DompetKu adalah aplikasi web responsive untuk mencatat keuangan pribadi. Aplikasi ini bisa dipakai dengan nyaman di HP maupun desktop. Pengguna dapat mencatat pemasukan dan pengeluaran dengan cepat, lalu mengelompokkannya ke dalam kategori. Pengguna juga dapat menetapkan anggaran bulanan per kategori dan mendapat peringatan saat anggaran hampir atau sudah terlampaui.

Semua catatan terkumpul di satu tempat. Ringkasan dan grafik bulanan menunjukkan ke mana uang pergi dan bagaimana trennya dari waktu ke waktu.

### 1.3 Manfaat Utama

| # | Benefit | Description |
|---|---------|-----------|
| 1 | Visibilitas pengeluaran | Pengguna tahu persis ke mana uangnya habis, dirinci per kategori dan per periode |
| 2 | Pengeluaran terkendali | Anggaran per kategori dan peringatan dini mencegah over-budget |
| 3 | Catatan terpusat | Semua transaksi tersimpan di satu aplikasi yang bisa diakses dari perangkat apa pun |

---

## 2. Business Objectives

### 2.1 Business Goals

> Angka target di bawah adalah target awal dan dapat disesuaikan setelah MVP berjalan.

| ID | Objective | Target | Measurement |
|----|-----------|--------|-------------|
| BO-01 | Membangun kebiasaan mencatat transaksi secara rutin | Pengguna mencatat transaksi minimal 5 hari per minggu, dalam 1 bulan setelah MVP rilis | Jumlah hari unik per minggu yang memiliki transaksi tercatat |
| BO-02 | Membuat pencatatan transaksi cepat dan mudah | Pencatatan 1 transaksi selesai dalam waktu kurang dari 15 detik | Waktu dari membuka form sampai transaksi tersimpan (uji kegunaan) |
| BO-03 | Mengendalikan pengeluaran bulanan | Total pengeluaran bulanan tidak melebihi total anggaran, mulai bulan kedua pemakaian | Perbandingan total pengeluaran dengan total anggaran di laporan bulanan |

### 2.2 Success Criteria

Project dianggap berhasil jika:
1. MVP (pencatatan transaksi, anggaran, laporan) rilis dalam 1 bulan (2 sprint).
2. Pengguna mencatat transaksi minimal 5 hari per minggu selama 4 minggu berturut-turut setelah rilis.
3. Rata-rata waktu mencatat 1 transaksi kurang dari 15 detik.
4. Dalam 2 bulan setelah rilis, ada minimal 1 bulan dengan total pengeluaran tidak melebihi total anggaran.

---

## 3. Stakeholders

| Stakeholder | Role | Interest Level | Contact |
|-------------|------|----------------|---------|
| Warsono | Sponsor & Business Owner | High | — |
| Warsono | End User (pengguna utama) | High | — |

---

## 4. Current State vs Future State

### 4.1 Current State (As-Is)

**Pain Points:**
| # | Problem | Impact | Frequency |
|---|---------|--------|-----------|
| 1 | Pengeluaran harian tidak tercatat, sehingga tidak tahu uang habis ke mana | Tidak bisa mengevaluasi atau memperbaiki pola pengeluaran | Harian |
| 2 | Tidak ada batas anggaran per kategori yang dipantau, sehingga sering over-budget | Pengeluaran melebihi rencana dan tabungan berkurang | Bulanan |
| 3 | Catatan keuangan tersebar di spreadsheet, notes, struk, dan ingatan | Sulit merekap, data tidak lengkap, dan banyak waktu terbuang | Mingguan |

### 4.2 Future State (To-Be)

**Improvements:**
| # | Improvement | Expected Benefit |
|---|-------------|------------------|
| 1 | Pencatatan transaksi cepat (< 15 detik) dari HP maupun desktop | Semua transaksi, termasuk yang kecil, ikut tercatat |
| 2 | Anggaran bulanan per kategori dengan indikator pemakaian dan peringatan | Over-budget terdeteksi lebih awal sehingga pengeluaran bisa direm |
| 3 | Satu tempat untuk semua catatan, lengkap dengan ringkasan dan grafik otomatis | Rekap bulanan instan tanpa hitung manual |

---

## 5. Epic & Feature Overview

<!--
NOTE: Detailed User Stories and Acceptance Criteria belong in SPEC documents.
This section contains only the high-level list.
-->

### 5.1 Epic List

| Epic ID | Epic Name | Description | Priority |
|---------|-----------|-------------|----------|
| EPIC-001 | Akun & Keamanan | Registrasi, login, dan logout agar data keuangan hanya bisa diakses pemiliknya | Must Have |
| EPIC-002 | Pencatatan Transaksi | Mencatat, melihat, mengubah, dan menghapus pemasukan/pengeluaran beserta kategorinya | Must Have |
| EPIC-003 | Anggaran | Menetapkan anggaran bulanan per kategori dan memantau pemakaiannya | Must Have |
| EPIC-004 | Laporan & Grafik | Ringkasan bulanan, grafik pengeluaran per kategori, dan tren antar bulan | Must Have |

### 5.2 Feature Summary per Epic

> SPEC Reference: story package di `docs/features/phase-01-mvp/` (dibuat via `/pm:feature`).

#### EPIC-001: Akun & Keamanan

| Feature ID | Feature Name | Priority | SPEC Reference |
|------------|--------------|----------|----------------|
| FEAT-001 | Registrasi akun | Must Have | `docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us01--registrasi-akun---story.md` |
| FEAT-002 | Login & logout | Must Have | `docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us02--login-logout---story.md` |

#### EPIC-002: Pencatatan Transaksi

| Feature ID | Feature Name | Priority | SPEC Reference |
|------------|--------------|----------|----------------|
| FEAT-003 | Catat pemasukan & pengeluaran (nominal, kategori, tanggal, catatan) | Must Have | `docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us01--catat-pengeluaran---story.md` (pengeluaran), `docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us02--catat-pemasukan---story.md` (pemasukan) |
| FEAT-004 | Daftar transaksi dengan filter periode & kategori | Must Have | `docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us03--daftar-transaksi---story.md` |
| FEAT-005 | Ubah & hapus transaksi | Must Have | `docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us04--ubah-hapus-transaksi---story.md` |
| FEAT-006 | Kelola kategori (kategori bawaan + kategori custom) | Should Have | `docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us05--kelola-kategori---story.md` |

#### EPIC-003: Anggaran

| Feature ID | Feature Name | Priority | SPEC Reference |
|------------|--------------|----------|----------------|
| FEAT-007 | Atur anggaran bulanan per kategori | Must Have | `docs/features/phase-01-mvp/e-03---anggaran/e03-us01--atur-anggaran-kategori---story.md` |
| FEAT-008 | Indikator pemakaian anggaran (sisa & persentase) | Must Have | `docs/features/phase-01-mvp/e-03---anggaran/e03-us02--indikator-pemakaian-anggaran---story.md` |
| FEAT-009 | Peringatan saat anggaran hampir habis (≥ 80%) atau terlampaui | Should Have | `docs/features/phase-01-mvp/e-03---anggaran/e03-us03--peringatan-anggaran---story.md` |

#### EPIC-004: Laporan & Grafik

| Feature ID | Feature Name | Priority | SPEC Reference |
|------------|--------------|----------|----------------|
| FEAT-010 | Dashboard ringkasan bulanan (pemasukan, pengeluaran, selisih) | Must Have | `docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us01--dashboard-ringkasan-bulanan---story.md` |
| FEAT-011 | Grafik pengeluaran per kategori | Must Have | `docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us02--grafik-pengeluaran-kategori---story.md` |
| FEAT-012 | Grafik tren pengeluaran antar bulan | Should Have | `docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us03--grafik-tren-bulanan---story.md` |

### 5.3 Di Luar Scope MVP

Hal-hal berikut sengaja tidak dimasukkan ke MVP dan dapat dipertimbangkan di fase berikutnya:
- Multi dompet/akun (kas, rekening bank, e-wallet) dengan saldo masing-masing
- Target tabungan
- Ekspor data (CSV/Excel) dan backup manual
- Berbagi catatan dengan keluarga/pasangan
- Aplikasi mobile native (Android/iOS)
- Integrasi otomatis dengan bank/e-wallet

---

## 6. Non-Functional Requirements

<!-- Coordinate with Tech Lead for exact specifications. Use business-friendly descriptions here; exact implementations go in ITA. -->

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | Waktu tampil halaman utama (dashboard) | < 2 detik |
| **Performance** | Waktu simpan transaksi | Terasa instan (< 1 detik) |
| **Security** | Autentikasi | Wajib login (email & password) sebelum mengakses data |
| **Security** | Isolasi data | Data keuangan hanya bisa dilihat dan diubah oleh pemilik akun |
| **Security** | Enkripsi | Seluruh komunikasi melalui HTTPS; password disimpan dalam bentuk hash |
| **Usability** | Kemudahan pakai | Fitur utama bisa dipakai tanpa tutorial |
| **Usability** | Kecepatan input | Mencatat 1 transaksi < 15 detik dengan jumlah langkah minimal |
| **Usability** | Responsive | Nyaman dipakai di HP (prioritas), tablet, dan desktop |
| **Usability** | Browser support | Chrome, Firefox, Safari, Edge (2 versi terakhir) |
| **Localization** | Bahasa & format | Bahasa Indonesia, format mata uang Rupiah (Rp) |

---

## 7. Constraints & Assumptions

### 7.1 Constraints

| # | Constraint | Impact |
|---|------------|--------|
| 1 | Timeline: 1 bulan (2 sprint @ 2 minggu) | Hanya fitur Must Have yang dijamin masuk MVP; Should Have dikerjakan jika waktu cukup |
| 2 | Platform: web app responsive saja | Tidak ada aplikasi mobile native di MVP |
| 3 | Budget: belum ditentukan (project personal) | Perlu dikonfirmasi; berpengaruh pada pilihan hosting dan layanan pihak ketiga |

### 7.2 Key Assumptions

| # | Assumption | Risk if Invalid |
|---|------------|-----------------|
| 1 | Pengguna mencatat transaksi secara manual (tanpa integrasi bank) | Jika pengguna malas input manual, BO-01 tidak tercapai; perlu fitur input yang sangat cepat |
| 2 | Satu mata uang (Rupiah) sudah cukup | Jika butuh multi-currency, model data dan laporan perlu diubah |
| 3 | Satu akun dipakai oleh satu orang | Jika butuh berbagi dengan keluarga, perlu fitur kolaborasi dan hak akses |
| 4 | Periode anggaran adalah bulan kalender | Jika pengguna gajian di tengah bulan, perlu opsi tanggal mulai periode custom |

---

## 8. Glossary

| Term | Definition |
|------|------------|
| Transaksi | Satu catatan pemasukan atau pengeluaran, berisi nominal, kategori, tanggal, dan catatan opsional |
| Kategori | Pengelompokan transaksi, misalnya Makan, Transportasi, Gaji, Hiburan |
| Anggaran (Budget) | Batas maksimal pengeluaran untuk satu kategori dalam satu bulan |
| Over-budget | Kondisi saat pengeluaran di suatu kategori melebihi anggarannya |
| MVP | Minimum Viable Product, versi awal aplikasi dengan fitur inti |

---

## 9. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor | Warsono | | |
| Business Owner | Warsono | | |

---

<!--
DOCUMENT NOTES:
- Detailed User Stories → See docs/features/phase-<nn>-<phase-name>/e-<nn>---<epic-short-name>/<story-prefix>---story.md
- Project Timeline → See docs/project/02-PEP.md
- Technical Architecture → See docs/project/03-ITA.md
- Data Model → See docs/project/03-ITA.md Section 6
-->
