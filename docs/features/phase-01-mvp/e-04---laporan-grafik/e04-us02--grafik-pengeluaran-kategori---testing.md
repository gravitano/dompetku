# STORY TESTING

## Related Story

- Story: `e04-us02--grafik-pengeluaran-kategori---story.md`
- Design: `e04-us02--grafik-pengeluaran-kategori---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Tab Laporan dengan bulan default = bulan berjalan
- Navigasi bulan ◀ / ▶ (▶ nonaktif di bulan berjalan)
- Total pengeluaran, urutan kategori, nominal, dan persentase
- Kategori terarsip tetap tampil
- Tap kategori menuju daftar transaksi terfilter
- Empty state, error state, dan isolasi data antar pengguna
- Tampilan di viewport HP dan desktop

Out of Scope:
- Grafik tren 6 bulan (E04-US03)
- Filter di halaman daftar transaksi itu sendiri (E02-US03)
- Validasi visual detail chart (warna/ukuran segmen). Yang diverifikasi adalah angka di daftar dan tooltip

## Gherkin Scenarios

```gherkin
Feature: Grafik pengeluaran per kategori

  Background:
    Given hari ini adalah "15 Oktober 2026"
    And pengguna "budi@example.com" memiliki pengeluaran September 2026:
      | tanggal    | kategori      | nominal |
      | 2026-09-02 | Makan & Minum | 600000  |
      | 2026-09-20 | Makan & Minum | 400000  |
      | 2026-09-05 | Transportasi  | 500000  |
      | 2026-09-10 | Tagihan       | 300000  |
      | 2026-09-15 | Hiburan       | 200000  |
    And pengguna "budi@example.com" memiliki pemasukan September 2026 sebesar 8000000 kategori "Gaji"
    And kategori "Hiburan" milik "budi@example.com" sudah diarsipkan
    And pengguna "budi@example.com" memiliki pengeluaran Oktober 2026 sebesar 25000 kategori "Makan & Minum"
    And saya sudah login sebagai "budi@example.com"

  @happy-path @smoke
  Scenario: Laporan menampilkan bulan berjalan secara default
    When saya membuka tab "Laporan"
    Then saya melihat bulan "Oktober 2026"
    And total pengeluaran menampilkan "Rp 25.000"
    And tombol "▶" tidak aktif

  @happy-path
  Scenario: Melihat pengeluaran per kategori bulan sebelumnya
    When saya membuka tab "Laporan"
    And saya menekan tombol "◀"
    Then saya melihat bulan "September 2026"
    And total pengeluaran menampilkan "Rp 2.000.000"
    And daftar kategori tampil berurutan:
      | kategori      | persentase | nominal      |
      | Makan & Minum | 50,0%      | Rp 1.000.000 |
      | Transportasi  | 25,0%      | Rp 500.000   |
      | Tagihan       | 15,0%      | Rp 300.000   |
      | Hiburan       | 10,0%      | Rp 200.000   |
    And pemasukan "Gaji" tidak dihitung di grafik

  @happy-path
  Scenario: Kategori terarsip tetap tampil di bulan yang memiliki transaksinya
    When saya membuka laporan "September 2026"
    Then kategori "Hiburan" tampil dengan label "(diarsipkan)"

  @happy-path
  Scenario: Tap kategori membuka daftar transaksi terfilter
    When saya membuka laporan "September 2026"
    And saya menekan kategori "Makan & Minum"
    Then saya berada di tab "Transaksi"
    And filter aktif adalah kategori "Makan & Minum" dan bulan "September 2026"
    And saya melihat 2 transaksi dengan total "Rp 1.000.000"

  @happy-path
  Scenario: Tooltip segmen menampilkan nominal lengkap
    When saya membuka laporan "September 2026"
    And saya menekan segmen "Transportasi" di grafik
    Then tooltip menampilkan "Transportasi", "Rp 500.000", dan "25,0%"

  @validation
  Scenario: Persentase dibulatkan dan totalnya sekitar 100%
    Given pengguna "ani@example.com" memiliki pengeluaran Oktober 2026: "Makan & Minum" 100000, "Transportasi" 100000, "Belanja" 100000
    And saya login sebagai "ani@example.com"
    When saya membuka tab "Laporan"
    Then setiap kategori menampilkan persentase "33,3%"
    And total pengeluaran menampilkan "Rp 300.000"

  @empty-state
  Scenario: Bulan tanpa pengeluaran
    When saya membuka laporan "Agustus 2026"
    Then total pengeluaran menampilkan "Rp 0"
    And saya melihat teks "Belum ada pengeluaran di bulan ini"
    And grafik donut tidak ditampilkan

  @error-handling
  Scenario: Gagal memuat laporan
    Given koneksi ke server terputus
    When saya membuka tab "Laporan"
    Then saya melihat pesan "Gagal memuat laporan. Periksa koneksi lalu coba lagi."
    And saya melihat tombol "Coba lagi"

  @security
  Scenario: Laporan tidak menghitung data pengguna lain
    Given pengguna "ani@example.com" tidak memiliki transaksi
    When saya logout dan login sebagai "ani@example.com"
    And saya membuka laporan "September 2026"
    Then saya melihat teks "Belum ada pengeluaran di bulan ini"
```

## QA Automation Notes

- Suggested test type: Playwright (web), dijalankan di viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Tanggal sistem dibekukan ke 15 Okt 2026 (`page.clock.setFixedTime`)
- Key selectors or interaction targets (gunakan `data-testid`):
  - `report-month-prev`, `report-month-next`, `report-month-label` (UX-01)
  - `expense-category-chart`, `chart-segment-<slug>`, `chart-tooltip` (UX-02)
  - `category-breakdown-item` dengan `data-category="<slug>"` (UX-03)
  - `report-total-expense`
  - `report-empty-state`, `report-retry-button` (UX-04)
- Assertions:
  - Isi dan urutan `category-breakdown-item` (nama, persentase, nominal) sama dengan tabel skenario
  - `report-month-next` memiliki atribut `disabled` di bulan berjalan
  - URL tab Transaksi berisi parameter filter kategori dan bulan
- Verifikasi angka lewat daftar/tooltip (teks), bukan lewat piksel chart

## Test Data

- `budi@example.com`: fixture pengeluaran September 2026 dengan total 2.000.000 (50% / 25% / 15% / 10%), 1 pemasukan Gaji (tidak ikut dihitung), kategori "Hiburan" diarsipkan, dan 1 pengeluaran Oktober 2026 sebesar 25.000
- `ani@example.com`: tanpa transaksi (skenario security), atau 3 pengeluaran @100.000 (skenario pembulatan), di-reset per test

## Open QA Questions

- Bagaimana perilaku jika ada > 7 kategori (apakah digabung "Lainnya" di donut)? Skenario perlu ditambah setelah diputuskan.
- Apakah tombol ◀ dibatasi sampai bulan transaksi pertama, atau bisa mundur tanpa batas (menampilkan empty state)?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us02--grafik-pengeluaran-kategori---testing.md

RELATED FILES:
- e04-us02--grafik-pengeluaran-kategori---story.md
- e04-us02--grafik-pengeluaran-kategori---design.md
-->
