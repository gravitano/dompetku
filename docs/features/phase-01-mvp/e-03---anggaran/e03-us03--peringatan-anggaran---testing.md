# STORY TESTING

## Related Story

- Story: `e03-us03--peringatan-anggaran---story.md`
- Design: `e03-us03--peringatan-anggaran---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Toast peringatan saat status kategori naik ke Hampir habis atau Terlampaui
- Aturan "hanya jika naik level" (tidak berulang, lompat langsung ke Terlampaui)
- Pembatasan ke bulan berjalan dan kategori beranggaran
- Banner di Beranda dan halaman Anggaran, termasuk hilang dengan sendirinya
- Isolasi data antar pengguna

Out of Scope:
- Email, push notification, pengaturan ambang
- Perhitungan persentase itu sendiri (E03-US02)

## Gherkin Scenarios

```gherkin
Feature: Peringatan anggaran

  Background:
    Given saya sudah login sebagai "budi@example.com"
    And hari ini adalah tanggal 15 Oktober 2026
    And kategori "Makan & Minum" memiliki anggaran Rp 1.500.000 untuk "Oktober 2026"

  @happy-path @smoke
  Scenario: Peringatan hampir habis saat melewati 80%
    Given pengeluaran "Makan & Minum" di "Oktober 2026" adalah Rp 1.100.000
    When saya mencatat pengeluaran "Makan & Minum" sebesar Rp 175.000 dengan tanggal hari ini
    Then saya melihat notifikasi "Pengeluaran tersimpan"
    And saya melihat peringatan "Anggaran Makan & Minum sudah terpakai 85%. Sisa Rp 225.000."
    And peringatan tersebut berwarna "kuning"

  @happy-path
  Scenario: Peringatan terlampaui saat melewati 100%
    Given pengeluaran "Makan & Minum" di "Oktober 2026" adalah Rp 1.300.000
    When saya mencatat pengeluaran "Makan & Minum" sebesar Rp 380.000 dengan tanggal hari ini
    Then saya melihat peringatan "Anggaran Makan & Minum terlampaui. Lebih Rp 180.000."
    And peringatan tersebut berwarna "merah"

  @happy-path
  Scenario: Lompat langsung dari aman ke terlampaui hanya menampilkan satu peringatan
    Given pengeluaran "Makan & Minum" di "Oktober 2026" adalah Rp 500.000
    When saya mencatat pengeluaran "Makan & Minum" sebesar Rp 1.100.000 dengan tanggal hari ini
    Then saya melihat peringatan "Anggaran Makan & Minum terlampaui. Lebih Rp 100.000."
    And saya tidak melihat peringatan "sudah terpakai"

  @happy-path
  Scenario: Tautan Lihat anggaran membuka halaman Anggaran
    Given pengeluaran "Makan & Minum" di "Oktober 2026" adalah Rp 1.100.000
    When saya mencatat pengeluaran "Makan & Minum" sebesar Rp 175.000 dengan tanggal hari ini
    And saya menekan "Lihat anggaran" pada peringatan
    Then saya berada di halaman "Anggaran" untuk "Oktober 2026"

  @validation
  Scenario Outline: Tidak ada peringatan jika status tidak naik level
    Given pengeluaran "Makan & Minum" di "Oktober 2026" adalah <sebelum>
    When saya mencatat pengeluaran "Makan & Minum" sebesar <nominal> dengan tanggal hari ini
    Then saya melihat notifikasi "Pengeluaran tersimpan"
    And saya tidak melihat peringatan anggaran

    Examples:
      | sebelum      | nominal    | keterangan                  |
      | Rp 500.000   | Rp 100.000 | tetap Aman                  |
      | Rp 1.250.000 | Rp 50.000  | tetap Hampir habis          |
      | Rp 1.600.000 | Rp 50.000  | sudah Terlampaui sebelumnya |

  @validation
  Scenario: Tidak ada peringatan untuk pengeluaran bulan lalu
    Given pengeluaran "Makan & Minum" di "Oktober 2026" adalah Rp 1.100.000
    When saya mencatat pengeluaran "Makan & Minum" sebesar Rp 500.000 bertanggal 30 September 2026
    Then saya tidak melihat peringatan anggaran

  @validation
  Scenario: Tidak ada peringatan untuk kategori tanpa anggaran
    Given kategori "Hiburan" tidak memiliki anggaran untuk "Oktober 2026"
    When saya mencatat pengeluaran "Hiburan" sebesar Rp 2.000.000 dengan tanggal hari ini
    Then saya tidak melihat peringatan anggaran

  @happy-path
  Scenario: Peringatan saat mengubah pengeluaran
    Given pengeluaran "Makan & Minum" di "Oktober 2026" adalah Rp 1.100.000 termasuk transaksi "Makan siang" Rp 50.000
    When saya mengubah nominal transaksi "Makan siang" menjadi Rp 250.000
    Then saya melihat peringatan "Anggaran Makan & Minum sudah terpakai 86%. Sisa Rp 200.000."

  @happy-path
  Scenario: Banner di Beranda dan halaman Anggaran
    Given kategori "Makan & Minum" berstatus "Terlampaui" di "Oktober 2026"
    And kategori "Transportasi" berstatus "Hampir habis" di "Oktober 2026"
    When saya membuka halaman "Beranda"
    Then saya melihat banner "2 kategori perlu perhatian: 1 terlampaui, 1 hampir habis"
    When saya menekan banner tersebut
    Then saya berada di halaman "Anggaran" untuk "Oktober 2026"
    And saya melihat banner "Terlampaui: Makan & Minum"
    And banner yang sama menampilkan "Hampir habis: Transportasi"

  @happy-path
  Scenario: Banner hilang setelah anggaran dinaikkan
    Given kategori "Makan & Minum" adalah satu-satunya kategori berstatus "Hampir habis" dengan pengeluaran Rp 1.275.000
    When saya mengubah anggaran "Makan & Minum" menjadi Rp 2.000.000
    And saya membuka halaman "Beranda"
    Then saya tidak melihat banner peringatan anggaran

  @validation
  Scenario: Banner tidak tampil di halaman Anggaran bulan lampau
    Given kategori "Makan & Minum" berstatus "Terlampaui" di "September 2026"
    When saya membuka halaman "Anggaran" dan menekan tombol "◀"
    Then saya tidak melihat banner peringatan anggaran

  @security
  Scenario: Peringatan tidak dipengaruhi data pengguna lain
    Given "ani@example.com" memiliki pengeluaran "Makan & Minum" Rp 5.000.000 di "Oktober 2026"
    And pengeluaran "Makan & Minum" milik "budi@example.com" di "Oktober 2026" adalah Rp 0
    When saya mencatat pengeluaran "Makan & Minum" sebesar Rp 100.000 dengan tanggal hari ini
    Then saya tidak melihat peringatan anggaran
    And saya tidak melihat banner peringatan anggaran di "Beranda"
```

## QA Automation Notes

- Suggested test type: Playwright (web). Logika perbandingan level sebelum/sesudah juga layak dites di level unit (Vitest) dengan tabel nilai batas.
- Suggested priority: P2 (Should Have). Skenario `@smoke` masuk `apps/test/web/smoke/` hanya jika FEAT-009 masuk rilis.
- Key selectors or interaction targets (gunakan `data-testid`):
  - `budget-alert-toast` dengan atribut `data-level="warning|over"` (UX-01)
  - `budget-alert-toast-link`, `budget-alert-toast-close` (UX-02)
  - `home-budget-alert-banner` (UX-03)
  - `budget-page-alert-banner` (UX-04)
  - Form pengeluaran memakai selector E02-US01 (`fab-add-transaction`, `transaction-amount-input`, `category-option-<slug>`, `transaction-date-picker`, `transaction-submit-button`)
- Assertions:
  - Toast peringatan muncul **setelah** toast "Pengeluaran tersimpan"
  - Jumlah toast peringatan tepat 0 atau 1 per penyimpanan
  - Level toast diverifikasi lewat `data-level`, bukan warna CSS
  - Banner muncul/hilang sesuai kondisi kategori bulan berjalan
- Tanggal "hari ini" dikunci dengan `page.clock`; kondisi awal pengeluaran disiapkan lewat seed

## Test Data

- Dua akun uji: `budi@example.com` dan `ani@example.com` dengan kategori bawaan
- Anggaran `budi@example.com` Oktober 2026: Makan & Minum Rp 1.500.000 dan Transportasi Rp 600.000; September 2026: Makan & Minum Rp 1.200.000
- Pengeluaran awal diatur per skenario melalui seed (reset sebelum setiap test)

## Open QA Questions

- Jika pengeluaran dipindah ke kategori lain (FEAT-005) sehingga kategori tujuan naik level, apakah peringatan harus muncul untuk kategori tujuan? Usulan: ya.
- Jika anggaran diturunkan (E03-US01) sehingga status naik level, apakah perlu toast peringatan, atau cukup banner? Usulan: cukup banner.

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-03---anggaran/e03-us03--peringatan-anggaran---testing.md

RELATED FILES:
- e03-us03--peringatan-anggaran---story.md
- e03-us03--peringatan-anggaran---design.md
-->
