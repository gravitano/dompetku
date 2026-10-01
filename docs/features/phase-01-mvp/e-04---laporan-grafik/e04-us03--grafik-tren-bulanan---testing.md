# STORY TESTING

## Related Story

- Story: `e04-us03--grafik-tren-bulanan---story.md`
- Design: `e04-us03--grafik-tren-bulanan---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Rentang 6 bulan terakhir termasuk bulan berjalan
- Nilai pemasukan dan pengeluaran per bulan (via tooltip), termasuk bulan tanpa data = Rp 0
- Perhitungan rata-rata pengeluaran
- Pesan untuk data < 2 bulan
- Error state dan isolasi data antar pengguna
- Tampilan di viewport HP dan desktop

Out of Scope:
- Grafik pengeluaran per kategori dan selector bulan (E04-US02)
- Validasi visual tinggi batang (yang diverifikasi adalah angka di tooltip dan rata-rata)

## Gherkin Scenarios

```gherkin
Feature: Grafik tren bulanan

  Background:
    Given hari ini adalah "15 Oktober 2026"
    And pengguna "budi@example.com" memiliki total transaksi per bulan:
      | bulan          | pemasukan | pengeluaran |
      | April 2026     | 8000000   | 5000000     |
      | Mei 2026       | 8000000   | 1000000     |
      | Juni 2026      | 8000000   | 2000000     |
      | Juli 2026      | 0         | 0           |
      | Agustus 2026   | 8000000   | 1500000     |
      | September 2026 | 8000000   | 3000000     |
      | Oktober 2026   | 8000000   | 1500000     |
    And saya sudah login sebagai "budi@example.com"

  @happy-path @smoke
  Scenario: Menampilkan tren 6 bulan terakhir termasuk bulan berjalan
    When saya membuka tab "Laporan"
    Then bagian "Tren 6 bulan" menampilkan bulan "Mei, Jun, Jul, Agu, Sep, Okt"
    And bulan "April 2026" tidak ditampilkan
    And saya melihat legenda "Pemasukan" dan "Pengeluaran"

  @happy-path
  Scenario: Tooltip menampilkan nominal lengkap
    When saya membuka tab "Laporan"
    And saya menekan batang bulan "Sep"
    Then tooltip menampilkan "September 2026"
    And tooltip menampilkan pemasukan "Rp 8.000.000" dan pengeluaran "Rp 3.000.000"

  @happy-path
  Scenario: Bulan tanpa transaksi tetap tampil dengan nilai nol
    When saya membuka tab "Laporan"
    And saya menekan batang bulan "Jul"
    Then tooltip menampilkan pemasukan "Rp 0" dan pengeluaran "Rp 0"

  @happy-path
  Scenario: Menampilkan rata-rata pengeluaran 6 bulan
    When saya membuka tab "Laporan"
    Then saya melihat "Rata-rata pengeluaran per bulan: Rp 1.500.000"

  @happy-path
  Scenario: Grafik tren tidak berubah saat bulan di selector diganti
    When saya membuka tab "Laporan"
    And saya menekan tombol "◀" di selector bulan
    Then bagian "Tren 6 bulan" tetap menampilkan bulan "Mei" sampai "Okt"

  @empty-state
  Scenario: Pengguna dengan data kurang dari 2 bulan
    Given pengguna "baru@example.com" hanya memiliki pengeluaran Oktober 2026 sebesar 600000
    And saya login sebagai "baru@example.com"
    When saya membuka tab "Laporan"
    Then saya melihat pesan "Tren akan lebih terlihat setelah ada data minimal 2 bulan"
    And grafik tren tetap ditampilkan dengan 6 bulan
    And saya melihat "Rata-rata pengeluaran per bulan: Rp 100.000"

  @error-handling
  Scenario: Gagal memuat tren tidak mengganggu grafik kategori
    Given permintaan data tren gagal
    When saya membuka tab "Laporan"
    Then saya melihat pesan "Gagal memuat tren. Coba lagi." di bagian tren
    And grafik pengeluaran per kategori tetap tampil

  @security
  Scenario: Tren tidak menghitung data pengguna lain
    Given pengguna "ani@example.com" tidak memiliki transaksi
    When saya logout dan login sebagai "ani@example.com"
    And saya membuka tab "Laporan"
    Then saya melihat "Rata-rata pengeluaran per bulan: Rp 0"
    And tooltip bulan "Sep" menampilkan pengeluaran "Rp 0"
```

## QA Automation Notes

- Suggested test type: Playwright (web), dijalankan di viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P2 (Should Have). Skenario `@smoke` masuk `apps/test/web/smoke/` hanya jika fitur jadi dirilis di MVP
- Tanggal sistem dibekukan ke 15 Okt 2026 (`page.clock.setFixedTime`)
- Key selectors or interaction targets (gunakan `data-testid`):
  - `trend-chart`, `trend-legend` (UX-01)
  - `trend-bar-<yyyy-mm>` (UX-02)
  - `trend-tooltip` (UX-03)
  - `trend-average-expense` (UX-04)
  - `trend-insufficient-data`, `trend-retry-button` (UX-05)
- Assertions:
  - Jumlah `trend-bar-*` = 6 dengan key `2026-05` s.d. `2026-10`
  - Teks tooltip dan rata-rata sama persis dengan fixture
  - Pesan data < 2 bulan hanya muncul untuk akun dengan data di < 2 bulan
- Error disimulasikan dengan `page.route` pada request data tren saja

## Test Data

- `budi@example.com`: fixture total per bulan April–Oktober 2026 (tabel Background). Total pengeluaran Mei–Okt = 9.000.000, sehingga rata-rata = 1.500.000. Data April sengaja ada untuk memastikan bulan ke-7 tidak ikut
- `baru@example.com`: hanya 1 pengeluaran Oktober 2026 sebesar 600.000 (rata-rata 600.000 ÷ 6 = 100.000)
- `ani@example.com`: tanpa transaksi

## Open QA Questions

- Jika rata-rata diputuskan hanya dari bulan penuh (lihat Open UX Questions di design), angka ekspektasi skenario rata-rata harus diubah.
- Bagaimana tooltip dibuka lewat keyboard (aksesibilitas desktop)? Perlu skenario tambahan jika diwajibkan.

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us03--grafik-tren-bulanan---testing.md

RELATED FILES:
- e04-us03--grafik-tren-bulanan---story.md
- e04-us03--grafik-tren-bulanan---design.md
-->
