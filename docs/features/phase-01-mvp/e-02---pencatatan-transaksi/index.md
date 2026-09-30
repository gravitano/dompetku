# EPIC INDEX

## Epic Metadata

### Epic Title
EPIC-002 — Pencatatan Transaksi

### Priority
High (Must Have)

### Owner
Warsono

### Target Release / Timeline
Sprint 1 (8–21 Okt 2026), milestone M3 Core Recording Ready

## 1. Overview

### Epic Summary
Pengguna tidak tahu ke mana uangnya habis karena pengeluaran harian jarang dicatat dan catatannya tersebar di banyak tempat. Epic ini menyediakan cara cepat dan terpusat untuk mencatat, melihat, mengubah, dan menghapus pemasukan serta pengeluaran beserta kategorinya.

### Business Objective
Mendukung BO-01 (mencatat secara rutin) dan BO-02 (mencatat 1 transaksi < 15 detik). Data transaksi dari epic ini juga menjadi dasar untuk Anggaran (EPIC-003) dan Laporan (EPIC-004).

### Target Users
- Individu yang ingin mencatat keuangan pribadinya (pengguna utama)

### Success Metrics
- Rata-rata waktu mencatat 1 transaksi < 15 detik.
- Pengguna mencatat transaksi minimal 5 hari per minggu.

## 2. Scope

### Scope / Key Capabilities
- Mencatat pengeluaran dan pemasukan dari satu form dengan toggle jenis (FEAT-003)
- Melihat daftar transaksi dengan filter periode dan kategori (FEAT-004)
- Mengubah dan menghapus transaksi (FEAT-005)
- Mengelola kategori bawaan dan kategori custom (FEAT-006, Should Have)

### Out of Scope
- Multi dompet/akun dan transfer antar dompet
- Transaksi berulang (recurring) dan foto struk
- Impor/ekspor data

## 3. Delivery Considerations

### Assumptions
- Transaksi dicatat manual oleh pengguna.
- Semua transaksi dalam Rupiah.
- Kategori bawaan sudah tersedia untuk setiap akun baru.

### Dependencies
- EPIC-001 Akun & Keamanan: pengguna harus sudah login.
- ITA: data model Transaction dan Category (`docs/project/03-ITA.md` §4.2).
- EPIC-003 Anggaran: perlakuan anggaran untuk kategori terarsip (E02-US05).

### Risks
- Jika form terlalu banyak langkah, pengguna malas mencatat dan BO-01 tidak tercapai.

## 4. Execution

### User Stories
| Story | Story File | Design File | Testing File | PM Sync |
|-------|------------|-------------|--------------|---------|
| E02-US01 Catat pengeluaran | [`e02-us01--catat-pengeluaran---story.md`](e02-us01--catat-pengeluaran---story.md) | [`e02-us01--catat-pengeluaran---design.md`](e02-us01--catat-pengeluaran---design.md) | [`e02-us01--catat-pengeluaran---testing.md`](e02-us01--catat-pengeluaran---testing.md) | Not synced |
| E02-US02 Catat pemasukan | [`e02-us02--catat-pemasukan---story.md`](e02-us02--catat-pemasukan---story.md) | [`e02-us02--catat-pemasukan---design.md`](e02-us02--catat-pemasukan---design.md) | [`e02-us02--catat-pemasukan---testing.md`](e02-us02--catat-pemasukan---testing.md) | Not synced |
| E02-US03 Daftar transaksi dengan filter | [`e02-us03--daftar-transaksi---story.md`](e02-us03--daftar-transaksi---story.md) | [`e02-us03--daftar-transaksi---design.md`](e02-us03--daftar-transaksi---design.md) | [`e02-us03--daftar-transaksi---testing.md`](e02-us03--daftar-transaksi---testing.md) | Not synced |
| E02-US04 Ubah dan hapus transaksi | [`e02-us04--ubah-hapus-transaksi---story.md`](e02-us04--ubah-hapus-transaksi---story.md) | [`e02-us04--ubah-hapus-transaksi---design.md`](e02-us04--ubah-hapus-transaksi---design.md) | [`e02-us04--ubah-hapus-transaksi---testing.md`](e02-us04--ubah-hapus-transaksi---testing.md) | Not synced |
| E02-US05 Kelola kategori *(Should Have)* | [`e02-us05--kelola-kategori---story.md`](e02-us05--kelola-kategori---story.md) | [`e02-us05--kelola-kategori---design.md`](e02-us05--kelola-kategori---design.md) | [`e02-us05--kelola-kategori---testing.md`](e02-us05--kelola-kategori---testing.md) | Not synced |

### Acceptance Criteria / Epic Completion Criteria
- Pengguna dapat mencatat pengeluaran dan pemasukan, dan hasilnya langsung terlihat di daftar transaksi.
- Pengguna dapat memfilter, mengubah, dan menghapus transaksi miliknya.
- Tidak ada pengguna yang dapat melihat atau mengubah transaksi milik pengguna lain.

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/index.md

RELATED FILES:
- e02-us01..us05 story, design, dan testing files (lihat tabel User Stories)
-->
