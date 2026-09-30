# EPIC INDEX

## Epic Metadata

### Epic Title
EPIC-003 — Anggaran

### Priority
High (Must Have)

### Owner
Warsono

### Target Release / Timeline
Sprint 2 (22 Okt – 4 Nov 2026), milestone M4 UAT Complete dan M5 Go-Live

## 1. Overview

### Epic Summary
Pengguna sering over-budget karena tidak ada batas pengeluaran per kategori yang dipantau. Kelebihan pengeluaran baru disadari di akhir bulan, saat sudah terlambat. Epic ini memungkinkan pengguna menetapkan anggaran bulanan per kategori pengeluaran, melihat seberapa banyak anggaran sudah terpakai, dan mendapat peringatan dini saat anggaran hampir habis atau terlampaui.

### Business Objective
Mendukung BO-03, yaitu total pengeluaran bulanan tidak melebihi total anggaran mulai bulan kedua pemakaian.

### Target Users
- Individu yang ingin mengendalikan pengeluaran bulanannya (pengguna utama)

### Success Metrics
- Dalam 2 bulan setelah rilis, ada minimal 1 bulan dengan total pengeluaran ≤ total anggaran.
- Pengguna menetapkan anggaran untuk bulan berjalan di minggu pertama setiap bulan.

## 2. Scope

### Scope / Key Capabilities
- Mengatur, mengubah, dan menghapus anggaran bulanan per kategori pengeluaran, termasuk menyalin anggaran dari bulan lalu (FEAT-007)
- Melihat pemakaian anggaran per kategori: terpakai, sisa, persentase, dan status warna (FEAT-008)
- Peringatan in-app saat anggaran kategori mencapai 80% atau terlampaui (FEAT-009, Should Have)

### Out of Scope
- Anggaran untuk kategori pemasukan
- Periode anggaran selain bulan kalender (misalnya mulai tanggal gajian)
- Rollover sisa anggaran ke bulan berikutnya
- Notifikasi email atau push notification
- Anggaran total bulanan tanpa kategori

## 3. Delivery Considerations

### Assumptions
- Periode anggaran adalah bulan kalender zona Asia/Jakarta.
- Pemakaian anggaran dihitung dari transaksi pengeluaran (EPIC-002) di kategori dan bulan yang sama.
- Nominal anggaran dalam Rupiah tanpa desimal, > 0 dan ≤ Rp 1.000.000.000.

### Dependencies
- EPIC-001 Akun & Keamanan: pengguna harus login.
- EPIC-002 Pencatatan Transaksi: sumber data pemakaian anggaran (E02-US01 Catat pengeluaran), serta kategori pengeluaran.
- ITA: data model Budget (`docs/project/03-ITA.md` §4.2).

### Risks
- Jika pengguna harus mengisi ulang anggaran setiap bulan, mereka bisa berhenti memakai fitur ini. Mitigasinya adalah tombol "Salin dari bulan lalu".
- Peringatan yang terlalu sering bisa dianggap mengganggu. Karena itu peringatan hanya muncul saat status kategori naik level.

## 4. Execution

### User Stories
| Story | Story File | Design File | Testing File | PM Sync |
|-------|------------|-------------|--------------|---------|
| E03-US01 Atur anggaran kategori | [`e03-us01--atur-anggaran-kategori---story.md`](e03-us01--atur-anggaran-kategori---story.md) | [`e03-us01--atur-anggaran-kategori---design.md`](e03-us01--atur-anggaran-kategori---design.md) | [`e03-us01--atur-anggaran-kategori---testing.md`](e03-us01--atur-anggaran-kategori---testing.md) | Not synced |
| E03-US02 Indikator pemakaian anggaran | [`e03-us02--indikator-pemakaian-anggaran---story.md`](e03-us02--indikator-pemakaian-anggaran---story.md) | [`e03-us02--indikator-pemakaian-anggaran---design.md`](e03-us02--indikator-pemakaian-anggaran---design.md) | [`e03-us02--indikator-pemakaian-anggaran---testing.md`](e03-us02--indikator-pemakaian-anggaran---testing.md) | Not synced |
| E03-US03 Peringatan anggaran | [`e03-us03--peringatan-anggaran---story.md`](e03-us03--peringatan-anggaran---story.md) | [`e03-us03--peringatan-anggaran---design.md`](e03-us03--peringatan-anggaran---design.md) | [`e03-us03--peringatan-anggaran---testing.md`](e03-us03--peringatan-anggaran---testing.md) | Not synced |

### Acceptance Criteria / Epic Completion Criteria
- Pengguna dapat menetapkan dan mengelola anggaran bulanan per kategori pengeluaran, termasuk menyalin dari bulan lalu.
- Pengguna dapat melihat pemakaian anggaran per kategori dan totalnya, dan angka tersebut selalu sesuai dengan transaksi terbaru.
- Pengguna mendapat peringatan in-app saat anggaran kategori mencapai 80% atau terlampaui (jika FEAT-009 masuk sprint).
- Tidak ada pengguna yang dapat melihat atau mengubah anggaran milik pengguna lain.

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-03---anggaran/index.md

RELATED FILES:
- e03-us01--atur-anggaran-kategori---story.md / ---design.md / ---testing.md
- e03-us02--indikator-pemakaian-anggaran---story.md / ---design.md / ---testing.md
- e03-us03--peringatan-anggaran---story.md / ---design.md / ---testing.md
-->
