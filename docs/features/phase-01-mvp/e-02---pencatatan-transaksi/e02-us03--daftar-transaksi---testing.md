# STORY TESTING

## Related Story

- Story: `e02-us03--daftar-transaksi---story.md`
- Design: `e02-us03--daftar-transaksi---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Tampilan default bulan berjalan, pengelompokan per tanggal, dan urutan
- Navigasi bulan dan batas bulan berjalan
- Filter jenis dan kategori (termasuk kategori terarsip), chip, dan reset
- Ringkasan total sesuai periode & filter, termasuk saat data belum dimuat semua
- Empty state, infinite scroll, dan error memuat
- Isolasi data antar pengguna

Out of Scope:
- Detail/ubah/hapus transaksi (E02-US04)
- Pencarian teks, rentang tanggal custom, ekspor

## Gherkin Scenarios

```gherkin
Feature: Daftar transaksi dengan filter

  Background:
    Given hari ini adalah "30 September 2026"
    And saya sudah login sebagai "budi@example.com"
    And saya memiliki transaksi berikut:
      | tanggal     | jenis       | kategori       | nominal   | catatan         |
      | 2026-09-30  | Pengeluaran | Makan & Minum  | 25000     | Makan siang     |
      | 2026-09-30  | Pengeluaran | Transportasi   | 18000     | Ojek            |
      | 2026-09-25  | Pemasukan   | Gaji           | 8000000   | Gaji September  |
      | 2026-09-10  | Pengeluaran | Tagihan        | 350000    | Listrik         |
      | 2026-08-31  | Pengeluaran | Belanja        | 200000    | Belanja bulanan |

  @happy-path @smoke
  Scenario: Menampilkan transaksi bulan berjalan per tanggal
    When saya membuka tab "Transaksi"
    Then saya melihat periode "September 2026"
    And saya melihat 4 transaksi dalam 3 kelompok tanggal
    And kelompok pertama adalah "Rabu, 30 Sep 2026"
    And transaksi "Belanja bulanan" tidak ditampilkan
    And ringkasan menampilkan Pemasukan "Rp 8.000.000", Pengeluaran "Rp 393.000", Selisih "Rp 7.607.000"

  @happy-path
  Scenario: Pindah ke bulan sebelumnya
    When saya membuka tab "Transaksi"
    And saya menekan tombol bulan sebelumnya
    Then saya melihat periode "Agustus 2026"
    And saya hanya melihat transaksi "Belanja bulanan"
    And ringkasan menampilkan Pengeluaran "Rp 200.000"

  @validation
  Scenario: Tidak bisa pindah ke bulan setelah bulan berjalan
    When saya membuka tab "Transaksi"
    Then tombol bulan berikutnya tidak aktif

  @happy-path
  Scenario: Filter berdasarkan jenis
    When saya membuka tab "Transaksi"
    And saya menerapkan filter jenis "Pemasukan"
    Then saya hanya melihat transaksi "Gaji September"
    And ringkasan menampilkan Pengeluaran "Rp 0"
    And saya melihat chip filter "Pemasukan"

  @happy-path
  Scenario: Filter berdasarkan beberapa kategori
    When saya membuka tab "Transaksi"
    And saya menerapkan filter kategori "Makan & Minum" dan "Transportasi"
    Then saya melihat transaksi "Makan siang" dan "Ojek"
    And ringkasan menampilkan Pengeluaran "Rp 43.000"

  @happy-path
  Scenario: Filter tetap berlaku saat pindah bulan
    Given saya menerapkan filter kategori "Belanja"
    When saya menekan tombol bulan sebelumnya
    Then saya melihat transaksi "Belanja bulanan"
    And chip filter "Belanja" masih tampil

  @happy-path
  Scenario: Menghapus filter lewat chip dan reset
    Given saya menerapkan filter jenis "Pengeluaran" dan kategori "Tagihan"
    When saya menekan ✕ pada chip "Tagihan"
    Then saya melihat 3 transaksi pengeluaran
    When saya menekan "Reset filter"
    Then saya melihat 4 transaksi

  @happy-path
  Scenario: Kategori terarsip tetap bisa difilter
    Given kategori "Tagihan" sudah diarsipkan
    When saya membuka panel filter
    Then kategori "Tagihan" tampil di bagian "Diarsipkan"
    When saya menerapkan filter kategori "Tagihan"
    Then saya melihat transaksi "Listrik"

  @empty-state
  Scenario: Bulan tanpa transaksi
    Given saya tidak memiliki transaksi di Juli 2026
    When saya membuka periode "Juli 2026"
    Then saya melihat pesan "Belum ada transaksi di Juli 2026"
    And saya melihat tombol "Catat transaksi"
    And ringkasan menampilkan semua nilai "Rp 0"

  @empty-state
  Scenario: Filter tanpa hasil
    When saya menerapkan filter kategori "Kesehatan"
    Then saya melihat pesan "Tidak ada transaksi yang cocok dengan filter"
    And saya melihat tombol "Reset filter"

  @pagination
  Scenario: Infinite scroll dengan ringkasan tetap akurat
    Given saya memiliki 120 transaksi pengeluaran masing-masing Rp 10.000 di September 2026
    When saya membuka tab "Transaksi"
    Then saya melihat 50 transaksi pertama
    And ringkasan Pengeluaran sudah menampilkan total seluruh 120 transaksi
    When saya scroll sampai akhir daftar dua kali
    Then saya melihat 120 transaksi
    And saya melihat teks "Semua transaksi sudah ditampilkan"

  @error-handling
  Scenario: Gagal memuat daftar
    Given server gagal merespons
    When saya membuka tab "Transaksi"
    Then saya melihat pesan "Gagal memuat transaksi."
    And saya melihat tombol "Coba lagi"

  @security
  Scenario: Daftar hanya berisi transaksi milik sendiri
    Given "ani@example.com" memiliki transaksi "Belanja Ani" di September 2026
    When saya membuka tab "Transaksi" sebagai "budi@example.com"
    Then transaksi "Belanja Ani" tidak muncul
    And ringkasan tidak memasukkan nominal milik "ani@example.com"
```

## QA Automation Notes

- Suggested test type: Playwright (web), viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `month-prev-button` (UX-01), `month-next-button` (UX-02), `month-label`
  - `filter-button` (UX-03), `filter-type-<all|expense|income>` (UX-07), `filter-category-<slug>`, `filter-apply-button`, `filter-reset-button`
  - `filter-chip-<slug>` (UX-04)
  - `summary-income`, `summary-expense`, `summary-net`
  - `transaction-group-<yyyy-mm-dd>`, `transaction-row-<id>` (UX-05)
  - `transaction-list-end` (UX-06)
- Assertions:
  - Urutan & pengelompokan tanggal
  - Nilai ringkasan sesuai data seed (hitung dari fixture, jangan hardcode di beberapa tempat)
  - Tanggal "hari ini" dikendalikan dengan `page.clock` agar test deterministik
  - Error memuat disimulasikan dengan `page.route` (status 500)

## Test Data

- Fixture transaksi sesuai tabel Background untuk `budi@example.com`
- Fixture 120 transaksi untuk skenario pagination (seed terpisah)
- `ani@example.com` dengan minimal 1 transaksi di September 2026

## Open QA Questions

- Apakah total harian di header tanggal ditampilkan sebagai nilai bersih (pemasukan − pengeluaran) atau hanya pengeluaran?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us03--daftar-transaksi---testing.md

RELATED FILES:
- e02-us03--daftar-transaksi---story.md
- e02-us03--daftar-transaksi---design.md
-->
