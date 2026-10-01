# STORY TESTING

## Related Story

- Story: `e02-us02--catat-pemasukan---story.md`
- Design: `e02-us02--catat-pemasukan---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Beralih ke mode Pemasukan lewat toggle dan mencatat pemasukan dengan data valid
- Perilaku toggle: kategori berganti, kategori terpilih dikosongkan, nominal & catatan dipertahankan
- Pemasukan menambah total pemasukan, bukan total pengeluaran
- Validasi dasar, pencegahan transaksi ganda, dan penanganan gagal simpan
- Isolasi data antar pengguna

Out of Scope:
- Validasi detail yang identik dengan E02-US01 (sudah diuji di sana; di sini cukup 1 sampel)
- Ubah/hapus transaksi, kategori custom, pemasukan berulang

## Gherkin Scenarios

```gherkin
Feature: Catat pemasukan

  Background:
    Given saya sudah login sebagai "budi@example.com"
    And saya berada di halaman Beranda

  @happy-path @smoke
  Scenario: Mencatat pemasukan gaji
    When saya menekan tombol "+"
    And saya memilih jenis "Pemasukan"
    And saya mengisi nominal "8000000"
    And saya memilih kategori "Gaji"
    And saya mengisi catatan "Gaji September"
    And saya menekan tombol "Simpan"
    Then saya melihat notifikasi "Pemasukan tersimpan"
    And transaksi "Gaji September" sebesar "+ Rp 8.000.000" muncul paling atas di daftar transaksi
    And total "Pemasukan bulan ini" bertambah Rp 8.000.000
    And total "Pengeluaran bulan ini" tidak berubah

  @happy-path
  Scenario: Form default ke Pengeluaran
    When saya menekan tombol "+"
    Then jenis "Pengeluaran" terpilih
    And judul form adalah "Catat Pengeluaran"

  @validation
  Scenario: Mengganti jenis mengganti daftar kategori
    When saya menekan tombol "+"
    And saya memilih kategori "Makan & Minum"
    And saya memilih jenis "Pemasukan"
    Then judul form adalah "Catat Pemasukan"
    And saya melihat kategori "Gaji", "Bonus", "Hadiah", dan "Lainnya"
    And saya tidak melihat kategori "Makan & Minum"
    And tidak ada kategori yang terpilih

  @validation
  Scenario: Nominal dan catatan tetap ada saat mengganti jenis
    When saya menekan tombol "+"
    And saya mengisi nominal "500000"
    And saya mengisi catatan "Uang dari teman"
    And saya memilih jenis "Pemasukan"
    Then field nominal tetap berisi "Rp 500.000"
    And field catatan tetap berisi "Uang dari teman"

  @validation
  Scenario: Kategori pemasukan wajib dipilih
    When saya menekan tombol "+"
    And saya memilih jenis "Pemasukan"
    And saya mengisi nominal "1000000"
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "Pilih kategori"
    And transaksi tidak tersimpan

  @validation
  Scenario: Nominal 0 ditolak pada mode pemasukan
    When saya menekan tombol "+"
    And saya memilih jenis "Pemasukan"
    And saya mengisi nominal "0"
    And saya memilih kategori "Bonus"
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "Nominal harus lebih dari 0" di bawah field nominal

  @error-handling
  Scenario: Tombol simpan ditekan dua kali
    When saya mengisi form pemasukan dengan data valid
    And saya menekan tombol "Simpan" dua kali dengan cepat
    Then hanya satu transaksi pemasukan yang tersimpan

  @error-handling
  Scenario: Gagal menyimpan karena koneksi terputus
    Given koneksi ke server terputus
    When saya mengisi form pemasukan dengan data valid
    And saya menekan tombol "Simpan"
    Then saya melihat pesan "Gagal menyimpan. Periksa koneksi lalu coba lagi."
    And jenis "Pemasukan" dan data yang sudah saya isi tetap ada di form

  @security
  Scenario: Pemasukan tidak terlihat oleh pengguna lain
    Given "budi@example.com" sudah mencatat pemasukan "Gaji September" sebesar Rp 8.000.000
    When saya logout dan login sebagai "ani@example.com"
    Then transaksi "Gaji September" tidak muncul di daftar transaksi
    And total "Pemasukan bulan ini" milik "ani@example.com" tidak berubah
```

## QA Automation Notes

- Suggested test type: Playwright (web), viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `apps/test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `fab-add-transaction`
  - `transaction-type-toggle-expense` / `transaction-type-toggle-income` (UX-01, UX-05)
  - `transaction-amount-input` (UX-02) — sama dengan E02-US01 (form bersama)
  - `category-option-<slug>` (UX-03)
  - `transaction-submit-button` (UX-04)
- Assertions:
  - Toast "Pemasukan tersimpan" tampil
  - Baris baru bertanda `+` dan berkelas/berwarna "income"
  - Total pemasukan bertambah dan total pengeluaran tetap
  - Kategori pengeluaran tidak muncul di mode Pemasukan

## Test Data

- Akun `budi@example.com` dan `ani@example.com` dengan kategori pemasukan bawaan (Gaji, Bonus, Hadiah, Lainnya)
- `budi@example.com` tanpa transaksi di awal test (reset via seed)

## Open QA Questions

- Apakah perlu skenario pemasukan dengan tanggal di bulan sebelumnya (misalnya gaji akhir bulan yang dicatat awal bulan berikutnya) sebagai test regresi laporan?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us02--catat-pemasukan---testing.md

RELATED FILES:
- e02-us02--catat-pemasukan---story.md
- e02-us02--catat-pemasukan---design.md
-->
