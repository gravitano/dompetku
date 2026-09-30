# STORY TESTING

## Related Story

- Story: `e03-us01--atur-anggaran-kategori---story.md`
- Design: `e03-us01--atur-anggaran-kategori---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Mengatur, mengubah, dan menghapus anggaran per kategori pengeluaran
- Validasi nominal anggaran
- Satu anggaran per kategori per bulan
- Perpindahan bulan, batas ke depan, dan read-only untuk bulan lampau
- Salin anggaran dari bulan lalu
- Total anggaran bulan
- Isolasi data antar pengguna
- Tampilan di viewport HP dan desktop

Out of Scope:
- Perhitungan pemakaian anggaran (E03-US02) dan peringatan anggaran (E03-US03)
- Anggaran kategori pemasukan

## Gherkin Scenarios

```gherkin
Feature: Atur anggaran kategori

  Background:
    Given saya sudah login sebagai "budi@example.com"
    And hari ini adalah tanggal 15 Oktober 2026
    And saya berada di halaman "Anggaran"

  @happy-path @smoke
  Scenario: Mengatur anggaran untuk kategori yang belum diatur
    Given kategori "Makan & Minum" belum memiliki anggaran untuk "Oktober 2026"
    When saya menekan kategori "Makan & Minum"
    And saya mengisi nominal "1500000"
    And saya menekan tombol "Simpan"
    Then saya melihat notifikasi "Anggaran tersimpan"
    And kategori "Makan & Minum" menampilkan "Rp 1.500.000"
    And "Total anggaran" bertambah Rp 1.500.000

  @happy-path
  Scenario: Mengubah anggaran yang sudah ada
    Given kategori "Transportasi" memiliki anggaran Rp 600.000 untuk "Oktober 2026"
    When saya menekan kategori "Transportasi"
    And saya mengubah nominal menjadi "750000"
    And saya menekan tombol "Simpan"
    Then kategori "Transportasi" menampilkan "Rp 750.000"
    And kategori "Transportasi" hanya memiliki satu anggaran untuk "Oktober 2026"

  @happy-path
  Scenario: Menghapus anggaran
    Given kategori "Belanja" memiliki anggaran Rp 1.000.000 untuk "Oktober 2026"
    When saya menekan kategori "Belanja"
    And saya menekan tombol "Hapus anggaran"
    And saya mengonfirmasi penghapusan
    Then kategori "Belanja" menampilkan "Belum diatur"
    And "Total anggaran" berkurang Rp 1.000.000

  @happy-path
  Scenario: Menyalin anggaran dari bulan lalu
    Given "Oktober 2026" memiliki anggaran "Makan & Minum" Rp 1.500.000 dan "Tagihan" Rp 1.400.000
    And "November 2026" belum memiliki anggaran
    When saya menekan tombol "▶"
    And saya menekan tombol "Salin dari bulan lalu"
    Then saya melihat notifikasi "Anggaran disalin dari Oktober 2026"
    And kategori "Makan & Minum" menampilkan "Rp 1.500.000"
    And kategori "Tagihan" menampilkan "Rp 1.400.000"
    And "Total anggaran" menampilkan "Rp 2.900.000"

  @validation
  Scenario: Tombol salin tidak tampil jika bulan sudah punya anggaran
    Given "Oktober 2026" sudah memiliki minimal satu anggaran
    Then tombol "Salin dari bulan lalu" tidak ditampilkan

  @validation
  Scenario Outline: Nominal anggaran tidak valid ditolak
    When saya menekan kategori "Hiburan"
    And saya mengisi nominal "<nominal>"
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "<pesan>" di bawah field nominal
    And anggaran tidak tersimpan

    Examples:
      | nominal     | pesan                              |
      |             | Nominal wajib diisi                |
      | 0           | Nominal harus lebih dari 0         |
      | 1000000001  | Nominal maksimal Rp 1.000.000.000  |

  @validation
  Scenario: Bulan lampau hanya bisa dilihat
    Given "September 2026" memiliki anggaran "Makan & Minum" Rp 1.200.000
    When saya menekan tombol "◀"
    Then saya melihat label "Hanya lihat"
    And kategori "Makan & Minum" menampilkan "Rp 1.200.000"
    And kategori tidak dapat ditekan untuk diubah

  @validation
  Scenario: Tidak bisa berpindah lebih dari 1 bulan ke depan
    When saya menekan tombol "▶"
    Then saya melihat bulan "November 2026"
    And tombol "▶" nonaktif

  @validation
  Scenario: Hanya kategori pengeluaran aktif yang ditampilkan
    Given saya memiliki kategori pemasukan "Gaji"
    And kategori pengeluaran "Hobi" sudah diarsipkan
    Then kategori "Gaji" tidak tampil di halaman Anggaran
    And kategori "Hobi" tidak tampil di halaman Anggaran untuk "Oktober 2026"

  @error-handling
  Scenario: Gagal menyimpan anggaran karena koneksi terputus
    Given koneksi ke server terputus
    When saya menekan kategori "Kesehatan"
    And saya mengisi nominal "300000"
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "Gagal menyimpan. Periksa koneksi lalu coba lagi."
    And field nominal tetap berisi "Rp 300.000"

  @security
  Scenario: Anggaran tidak terlihat oleh pengguna lain
    Given "budi@example.com" memiliki anggaran "Makan & Minum" Rp 1.500.000 untuk "Oktober 2026"
    When saya logout dan login sebagai "ani@example.com"
    And saya membuka halaman "Anggaran"
    Then kategori "Makan & Minum" menampilkan "Belum diatur"
```

## QA Automation Notes

- Suggested test type: Playwright (web), dijalankan di viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `budget-month-prev`, `budget-month-next`, `budget-month-label` (UX-01)
  - `budget-total` (UX-02)
  - `budget-row-<category-slug>` (UX-03)
  - `budget-copy-previous-button` (UX-04)
  - `budget-amount-input` (UX-05)
  - `budget-submit-button` (UX-06)
  - `budget-delete-button` (UX-07)
  - `budget-readonly-label`
- Assertions:
  - Nilai nominal per baris dan total sesuai format Rupiah
  - Satu kategori hanya punya satu anggaran per bulan setelah diatur dua kali
  - Tombol salin muncul/hilang sesuai kondisi bulan
  - Bulan lampau tidak menampilkan kontrol ubah
- Tanggal "hari ini" dikunci dengan `page.clock` (Playwright clock API) agar skenario bulan konsisten

## Test Data

- Dua akun uji: `budi@example.com` dan `ani@example.com` (password dari fixture `test/web/fixtures/`), masing-masing dengan kategori bawaan
- Seed anggaran `budi@example.com`: September 2026 (Makan & Minum Rp 1.200.000) dan Oktober 2026 (sesuai kebutuhan per skenario)
- Satu kategori pengeluaran diarsipkan ("Hobi") dan satu kategori pemasukan ("Gaji") untuk skenario filter kategori

## Open QA Questions

- Jika kategori diarsipkan di tengah bulan, apakah anggarannya untuk bulan berjalan tetap ditampilkan?
- Apakah salin dari bulan lalu perlu melewati kategori yang sudah diarsipkan tanpa pemberitahuan, atau memberi info jumlah kategori yang dilewati?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-03---anggaran/e03-us01--atur-anggaran-kategori---testing.md

RELATED FILES:
- e03-us01--atur-anggaran-kategori---story.md
- e03-us01--atur-anggaran-kategori---design.md
-->
