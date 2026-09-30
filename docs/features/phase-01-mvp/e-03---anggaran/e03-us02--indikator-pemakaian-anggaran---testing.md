# STORY TESTING

## Related Story

- Story: `e03-us02--indikator-pemakaian-anggaran---story.md`
- Design: `e03-us02--indikator-pemakaian-anggaran---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Perhitungan terpakai, sisa, dan persentase per kategori
- Aturan warna hijau/kuning/merah dan teks "Lebih Rp X"
- Ringkasan total terpakai vs total anggaran
- Bagian "Tanpa anggaran"
- Pembaruan angka setelah transaksi ditambah, diubah, atau dihapus
- Indikator di bulan lampau
- Isolasi data antar pengguna

Out of Scope:
- Toast/banner peringatan (E03-US03)
- Grafik dan ringkasan di Beranda (EPIC-004)

## Gherkin Scenarios

```gherkin
Feature: Indikator pemakaian anggaran

  Background:
    Given saya sudah login sebagai "budi@example.com"
    And hari ini adalah tanggal 15 Oktober 2026

  @happy-path @smoke
  Scenario: Menampilkan pemakaian anggaran per kategori
    Given kategori "Belanja" memiliki anggaran Rp 1.000.000 untuk "Oktober 2026"
    And saya memiliki pengeluaran "Belanja" total Rp 400.000 di "Oktober 2026"
    When saya membuka halaman "Anggaran"
    Then kategori "Belanja" menampilkan "Rp 400.000 / Rp 1.000.000"
    And kategori "Belanja" menampilkan "Sisa Rp 600.000"
    And kategori "Belanja" menampilkan "40%"
    And status kategori "Belanja" berwarna "hijau"

  @happy-path
  Scenario Outline: Warna status mengikuti persentase terpakai
    Given kategori "Transportasi" memiliki anggaran Rp 100.000 untuk "Oktober 2026"
    And saya memiliki pengeluaran "Transportasi" total <terpakai> di "Oktober 2026"
    When saya membuka halaman "Anggaran"
    Then kategori "Transportasi" menampilkan "<persen>"
    And status kategori "Transportasi" berwarna "<warna>"
    And kategori "Transportasi" menampilkan "<teks sisa>"

    Examples:
      | terpakai   | persen | warna  | teks sisa          |
      | Rp 79.999  | 79%    | hijau  | Sisa Rp 20.001     |
      | Rp 80.000  | 80%    | kuning | Sisa Rp 20.000     |
      | Rp 99.999  | 99%    | kuning | Sisa Rp 1          |
      | Rp 100.000 | 100%   | merah  | Sisa Rp 0          |
      | Rp 112.000 | 112%   | merah  | Lebih Rp 12.000    |

  @happy-path
  Scenario: Ringkasan total terpakai vs total anggaran
    Given total anggaran "Oktober 2026" adalah Rp 4.500.000
    And total seluruh pengeluaran "Oktober 2026" adalah Rp 3.420.000
    When saya membuka halaman "Anggaran"
    Then kartu ringkasan menampilkan "Terpakai Rp 3.420.000 dari Rp 4.500.000"
    And kartu ringkasan menampilkan "76%"
    And kartu ringkasan menampilkan "Sisa Rp 1.080.000"

  @happy-path
  Scenario: Kategori tanpa anggaran yang memiliki pengeluaran
    Given kategori "Hiburan" tidak memiliki anggaran untuk "Oktober 2026"
    And saya memiliki pengeluaran "Hiburan" total Rp 250.000 di "Oktober 2026"
    When saya membuka halaman "Anggaran"
    Then kategori "Hiburan" tampil di bagian "Tanpa anggaran" dengan nominal "Rp 250.000"
    And saya melihat tautan "Atur anggaran" di baris "Hiburan"

  @happy-path
  Scenario: Indikator diperbarui setelah mencatat pengeluaran
    Given kategori "Makan & Minum" memiliki anggaran Rp 1.500.000 dan terpakai Rp 1.100.000 untuk "Oktober 2026"
    When saya mencatat pengeluaran "Makan & Minum" sebesar Rp 200.000 melalui form Catat Pengeluaran
    And saya membuka halaman "Anggaran"
    Then kategori "Makan & Minum" menampilkan "Rp 1.300.000 / Rp 1.500.000"
    And status kategori "Makan & Minum" berwarna "kuning"

  @happy-path
  Scenario: Indikator diperbarui setelah menghapus transaksi
    Given kategori "Makan & Minum" memiliki anggaran Rp 1.500.000 dan terpakai Rp 1.680.000 untuk "Oktober 2026"
    When saya menghapus transaksi "Makan & Minum" sebesar Rp 300.000
    And saya membuka halaman "Anggaran"
    Then kategori "Makan & Minum" menampilkan "Sisa Rp 120.000"
    And status kategori "Makan & Minum" berwarna "kuning"

  @validation
  Scenario: Transaksi bulan lain tidak dihitung
    Given kategori "Belanja" memiliki anggaran Rp 1.000.000 untuk "Oktober 2026"
    And saya memiliki pengeluaran "Belanja" Rp 500.000 bertanggal 30 September 2026
    And saya tidak memiliki pengeluaran "Belanja" di "Oktober 2026"
    When saya membuka halaman "Anggaran"
    Then kategori "Belanja" menampilkan "0%"

  @validation
  Scenario: Indikator bulan lampau tetap tampil
    Given "September 2026" memiliki anggaran "Makan & Minum" Rp 1.200.000 dan terpakai Rp 1.260.000
    When saya membuka halaman "Anggaran" dan menekan tombol "◀"
    Then kategori "Makan & Minum" menampilkan "Lebih Rp 60.000"
    And status kategori "Makan & Minum" berwarna "merah"

  @error-handling
  Scenario: Gagal memuat data anggaran
    Given server tidak dapat dihubungi
    When saya membuka halaman "Anggaran"
    Then saya melihat pesan "Gagal memuat anggaran. Coba lagi."
    And saya melihat tombol "Coba lagi"

  @security
  Scenario: Pemakaian anggaran tidak menghitung transaksi pengguna lain
    Given "ani@example.com" memiliki pengeluaran "Belanja" Rp 900.000 di "Oktober 2026"
    And "budi@example.com" memiliki anggaran "Belanja" Rp 1.000.000 tanpa pengeluaran di "Oktober 2026"
    When saya membuka halaman "Anggaran" sebagai "budi@example.com"
    Then kategori "Belanja" menampilkan "0%"
```

## QA Automation Notes

- Suggested test type: Playwright (web) untuk tampilan. Perhitungan persentase dan ambang warna juga layak dites di level unit (Vitest), terutama nilai batas 79,99% / 80% / 100%.
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `budget-summary-card`, `budget-summary-percent`, `budget-summary-remaining` (UX-01)
  - `budget-row-<category-slug>`, `budget-row-<category-slug>-percent`, `budget-row-<category-slug>-remaining` (UX-02)
  - Atribut `data-status="green|yellow|red"` pada `budget-row-<category-slug>` untuk asersi warna
  - `budget-unbudgeted-section`, `budget-unbudgeted-set-<category-slug>` (UX-03)
  - `budget-load-error`, `budget-retry-button`
- Assertions:
  - Nominal, persentase (dibulatkan ke bawah), dan teks sisa/lebih sesuai tabel contoh
  - Asersi warna memakai `data-status`, bukan warna CSS
  - Urutan baris dari persentase tertinggi
- Tanggal "hari ini" dikunci dengan `page.clock`; data transaksi disiapkan lewat seed/fixture, bukan melalui UI (kecuali skenario pembaruan setelah catat pengeluaran)

## Test Data

- Dua akun uji: `budi@example.com` dan `ani@example.com` dengan kategori bawaan
- Seed anggaran dan transaksi `budi@example.com` untuk September dan Oktober 2026 sesuai tiap skenario (reset sebelum setiap test)
- Transaksi `ani@example.com` di kategori yang sama untuk skenario isolasi data

## Open QA Questions

- Jika transaksi dipindah ke kategori atau bulan lain (FEAT-005), apakah kedua kategori harus diverifikasi di satu skenario?
- Bagaimana perilaku indikator jika kategori beranggaran diarsipkan di tengah bulan?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-03---anggaran/e03-us02--indikator-pemakaian-anggaran---testing.md

RELATED FILES:
- e03-us02--indikator-pemakaian-anggaran---story.md
- e03-us02--indikator-pemakaian-anggaran---design.md
-->
