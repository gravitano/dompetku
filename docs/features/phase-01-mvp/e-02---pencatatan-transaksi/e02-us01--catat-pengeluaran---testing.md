# STORY TESTING

## Related Story

- Story: `e02-us01--catat-pengeluaran---story.md`
- Design: `e02-us01--catat-pengeluaran---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Mencatat pengeluaran dengan data valid, baik dengan tanggal default maupun tanggal yang diubah
- Validasi nominal, kategori, tanggal, dan panjang catatan
- Pencegahan transaksi ganda dan penanganan gagal simpan
- Isolasi data antar pengguna
- Tampilan di viewport HP dan desktop

Out of Scope:
- Mencatat pemasukan, mengubah/menghapus transaksi, kategori custom, dan peringatan anggaran
- Pengukuran waktu < 15 detik (diverifikasi manual saat UAT, bukan otomatis)

## Gherkin Scenarios

```gherkin
Feature: Catat pengeluaran

  Background:
    Given saya sudah login sebagai "budi@example.com"
    And saya berada di halaman utama

  @happy-path @smoke
  Scenario: Mencatat pengeluaran dengan tanggal default
    When saya menekan tombol "+"
    And saya mengisi nominal "25000"
    And saya memilih kategori "Makan & Minum"
    And saya mengisi catatan "Makan siang"
    And saya menekan tombol "Simpan"
    Then saya melihat notifikasi "Pengeluaran tersimpan"
    And transaksi "Makan siang" sebesar "Rp 25.000" dengan tanggal hari ini muncul paling atas di daftar transaksi
    And total "Pengeluaran bulan ini" bertambah Rp 25.000

  @happy-path
  Scenario: Mencatat pengeluaran untuk tanggal kemarin tanpa catatan
    When saya menekan tombol "+"
    And saya mengisi nominal "18000"
    And saya memilih kategori "Transportasi"
    And saya memilih tanggal kemarin
    And saya menekan tombol "Simpan"
    Then saya melihat notifikasi "Pengeluaran tersimpan"
    And transaksi sebesar "Rp 18.000" dengan tanggal kemarin muncul di daftar transaksi

  @validation
  Scenario: Nominal diformat otomatis saat diketik
    When saya menekan tombol "+"
    And saya mengisi nominal "1500000"
    Then field nominal menampilkan "Rp 1.500.000"

  @validation
  Scenario Outline: Nominal tidak valid ditolak
    When saya menekan tombol "+"
    And saya mengisi nominal "<nominal>"
    And saya memilih kategori "Belanja"
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "<pesan>" di bawah field nominal
    And transaksi tidak tersimpan
    And kategori "Belanja" tetap terpilih

    Examples:
      | nominal     | pesan                                       |
      |             | Nominal wajib diisi                         |
      | 0           | Nominal harus lebih dari 0                  |
      | 1000000001  | Nominal maksimal Rp 1.000.000.000           |

  @validation
  Scenario: Kategori wajib dipilih
    When saya menekan tombol "+"
    And saya mengisi nominal "50000"
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "Pilih kategori"
    And field nominal tetap berisi "Rp 50.000"

  @validation
  Scenario: Tanggal setelah hari ini tidak bisa dipilih
    When saya menekan tombol "+"
    And saya membuka pilihan tanggal
    Then tanggal besok tidak dapat dipilih

  @validation
  Scenario: Catatan dibatasi 100 karakter
    When saya menekan tombol "+"
    And saya mengetik 120 karakter di field catatan
    Then field catatan hanya berisi 100 karakter
    And penghitung menampilkan "100/100"

  @error-handling
  Scenario: Tombol simpan ditekan dua kali
    When saya mengisi form pengeluaran dengan data valid
    And saya menekan tombol "Simpan" dua kali dengan cepat
    Then hanya satu transaksi yang tersimpan

  @error-handling
  Scenario: Gagal menyimpan karena koneksi terputus
    Given koneksi ke server terputus
    When saya mengisi form pengeluaran dengan data valid
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "Gagal menyimpan. Periksa koneksi lalu coba lagi."
    And data yang sudah saya isi tetap ada di form

  @error-handling
  Scenario: Membatalkan form yang sudah terisi
    When saya menekan tombol "+"
    And saya mengisi nominal "10000"
    And saya menekan tombol "✕"
    Then saya melihat konfirmasi "Buang perubahan?"

  @security
  Scenario: Pengeluaran tidak terlihat oleh pengguna lain
    Given "budi@example.com" sudah mencatat pengeluaran "Makan siang" sebesar Rp 25.000
    When saya logout dan login sebagai "ani@example.com"
    Then transaksi "Makan siang" tidak muncul di daftar transaksi
```

## QA Automation Notes

- Suggested test type: Playwright (web), dijalankan di viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `fab-add-transaction` (UX-06)
  - `transaction-amount-input` (UX-01)
  - `category-option-<slug>` (UX-02)
  - `transaction-date-picker` (UX-03)
  - `transaction-note-input` (UX-04)
  - `transaction-submit-button` (UX-05)
  - `transaction-cancel-button` (UX-07)
- Assertions:
  - Toast "Pengeluaran tersimpan" tampil
  - Baris transaksi baru ada di posisi teratas daftar, dengan nominal dan tanggal yang benar
  - Total pengeluaran bulan berjalan berubah sesuai nominal
  - Jumlah transaksi bertambah tepat 1 (skenario double submit)
  - Gagal simpan disimulasikan dengan `page.route` (abort request) atau `context.setOffline(true)`

## Test Data

- Dua akun uji: `budi@example.com` dan `ani@example.com` (password dari fixture `test/web/fixtures/`), masing-masing dengan kategori bawaan
- Akun `budi@example.com` dalam kondisi tanpa transaksi di awal test (reset via seed) agar total bulan berjalan bisa dihitung

## Open QA Questions

- Apakah batas maksimal Rp 1.000.000.000 per transaksi sudah sesuai?
- Apakah pencatatan tanggal mundur perlu dibatasi (misalnya maksimal 1 tahun ke belakang)?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us01--catat-pengeluaran---testing.md

RELATED FILES:
- e02-us01--catat-pengeluaran---story.md
- e02-us01--catat-pengeluaran---design.md
-->
