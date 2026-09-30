# STORY TESTING

## Related Story

- Story: `e04-us01--dashboard-ringkasan-bulanan---story.md`
- Design: `e04-us01--dashboard-ringkasan-bulanan---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Redirect ke Beranda setelah login
- Perhitungan total pemasukan, pengeluaran, dan selisih bulan berjalan, termasuk warna/tanda selisih
- Ringkasan anggaran (ada anggaran vs belum ada anggaran)
- 5 transaksi terbaru, link "Lihat semua", dan FAB "+"
- Update otomatis setelah transaksi baru dicatat
- Empty state pengguna baru, error state, dan isolasi data antar pengguna
- Tampilan di viewport HP dan desktop

Out of Scope:
- Validasi form catat transaksi (E02-US01 dan story catat pemasukan)
- Detail indikator anggaran per kategori (EPIC-003)
- Pengukuran performa < 2 detik secara presisi (diverifikasi lewat Lighthouse/manual saat UAT)

## Gherkin Scenarios

```gherkin
Feature: Dashboard ringkasan bulanan

  Background:
    Given hari ini adalah "15 Oktober 2026"
    And pengguna "budi@example.com" memiliki transaksi Oktober 2026:
      | tanggal    | tipe        | kategori      | nominal   | catatan         |
      | 2026-10-01 | pemasukan   | Gaji          | 8000000   | Gaji Oktober    |
      | 2026-10-05 | pengeluaran | Tagihan       | 350000    | Listrik         |
      | 2026-10-10 | pengeluaran | Belanja       | 450000    | Belanja bulanan |
      | 2026-10-12 | pengeluaran | Transportasi  | 18000     | Ojek            |
      | 2026-10-12 | pengeluaran | Makan & Minum | 25000     | Makan siang     |
      | 2026-10-14 | pengeluaran | Hiburan       | 100000    | Nonton          |
    And pengguna "budi@example.com" memiliki transaksi September 2026 sebesar 500000 kategori "Belanja"

  @happy-path @smoke
  Scenario: Beranda menampilkan ringkasan bulan berjalan setelah login
    When saya login sebagai "budi@example.com"
    Then saya berada di halaman "Beranda"
    And saya melihat judul periode "Oktober 2026"
    And total pemasukan menampilkan "Rp 8.000.000"
    And total pengeluaran menampilkan "Rp 943.000"
    And selisih menampilkan "+ Rp 7.057.000" berwarna hijau

  @happy-path
  Scenario: Selisih negatif ditampilkan merah
    Given pengguna "ani@example.com" pada Oktober 2026 memiliki pemasukan 1000000 dan pengeluaran 1500000
    When saya login sebagai "ani@example.com"
    Then selisih menampilkan "− Rp 500.000" berwarna merah

  @happy-path
  Scenario: Menampilkan 5 transaksi terbaru
    Given saya sudah login sebagai "budi@example.com"
    When saya membuka "Beranda"
    Then saya melihat tepat 5 transaksi di bagian "Transaksi terbaru"
    And transaksi pertama adalah "Nonton" sebesar "- Rp 100.000"
    And transaksi "Gaji Oktober" tidak ada di daftar transaksi terbaru

  @happy-path
  Scenario: Ringkasan anggaran tampil jika anggaran sudah diatur
    Given saya sudah login sebagai "budi@example.com"
    And total anggaran Oktober 2026 saya adalah 3000000
    When saya membuka "Beranda"
    Then saya melihat "Rp 943.000 dari Rp 3.000.000" di kartu anggaran
    When saya menekan "Lihat anggaran"
    Then saya berada di tab "Anggaran"

  @happy-path
  Scenario: Ajakan mengatur anggaran jika belum ada anggaran
    Given saya sudah login sebagai "budi@example.com"
    And saya belum mengatur anggaran untuk Oktober 2026
    When saya membuka "Beranda"
    Then saya melihat ajakan "Atur anggaran bulan ini"

  @happy-path
  Scenario: Link Lihat semua membuka tab Transaksi
    Given saya sudah login sebagai "budi@example.com"
    When saya menekan "Lihat semua"
    Then saya berada di tab "Transaksi"

  @happy-path
  Scenario: Ringkasan ter-update setelah mencatat pengeluaran
    Given saya sudah login sebagai "budi@example.com"
    When saya menekan tombol "+"
    And saya mencatat pengeluaran 50000 kategori "Makan & Minum" dengan catatan "Kopi"
    Then total pengeluaran menampilkan "Rp 993.000"
    And transaksi pertama di "Transaksi terbaru" adalah "Kopi"

  @empty-state
  Scenario: Pengguna baru tanpa transaksi
    Given pengguna "baru@example.com" belum memiliki transaksi
    When saya login sebagai "baru@example.com"
    Then total pemasukan, total pengeluaran, dan selisih menampilkan "Rp 0"
    And saya melihat teks "Belum ada transaksi, catat pengeluaran pertamamu"
    When saya menekan tombol "Catat pengeluaran"
    Then form "Catat Pengeluaran" terbuka

  @error-handling
  Scenario: Gagal memuat ringkasan
    Given saya sudah login sebagai "budi@example.com"
    And koneksi ke server terputus
    When saya membuka "Beranda"
    Then saya melihat pesan "Gagal memuat ringkasan. Periksa koneksi lalu coba lagi."
    And saya melihat tombol "Coba lagi"

  @security
  Scenario: Ringkasan tidak menghitung data pengguna lain
    Given pengguna "ani@example.com" tidak memiliki transaksi
    When saya login sebagai "ani@example.com"
    Then total pengeluaran menampilkan "Rp 0"
    And transaksi "Makan siang" milik "budi@example.com" tidak muncul di Beranda
```

## QA Automation Notes

- Suggested test type: Playwright (web), dijalankan di viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Tanggal sistem dibekukan ke 15 Okt 2026 (`page.clock.setFixedTime`) agar "bulan berjalan" deterministik
- Key selectors or interaction targets (gunakan `data-testid`):
  - `summary-income-total`, `summary-expense-total`, `summary-balance` (UX-01)
  - `budget-summary-card`, `budget-summary-link` (UX-02)
  - `recent-transactions-see-all` (UX-03)
  - `recent-transaction-item` (UX-04)
  - `fab-add-transaction` (UX-05)
  - `dashboard-empty-cta` (UX-06)
  - `dashboard-retry-button` (UX-07)
  - `bottom-nav-home`, `bottom-nav-transactions`, `bottom-nav-budgets`, `bottom-nav-reports`
- Assertions:
  - Nilai kartu ringkasan sama persis dengan total fixture
  - Atribut/kelas warna selisih (`data-state="positive|negative|zero"`)
  - Jumlah `recent-transaction-item` = 5 dan urutannya benar
  - URL berpindah ke tab yang benar setelah tap link
- Error disimulasikan dengan `page.route` (abort request data Beranda)

## Test Data

- `budi@example.com`: fixture transaksi Oktober 2026 (tabel Background) + 1 transaksi September 2026, dengan total yang mudah diverifikasi (pemasukan 8.000.000, pengeluaran 943.000)
- `ani@example.com`: tanpa transaksi (skenario security) atau dengan pemasukan 1.000.000 dan pengeluaran 1.500.000 (skenario selisih negatif), di-reset per test
- `baru@example.com`: akun baru tanpa transaksi dan tanpa anggaran
- Fixture anggaran Oktober 2026 untuk `budi@example.com` dengan total 3.000.000 (dari EPIC-003)

## Open QA Questions

- Apakah transaksi terbaru lintas bulan (lihat Open UX Questions di design)? Skenario empty state bergantung pada keputusan ini.
- Apakah target < 2 detik perlu diuji otomatis (misal budget Lighthouse di CI) atau cukup manual saat UAT?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-04---laporan-grafik/e04-us01--dashboard-ringkasan-bulanan---testing.md

RELATED FILES:
- e04-us01--dashboard-ringkasan-bulanan---story.md
- e04-us01--dashboard-ringkasan-bulanan---design.md
-->
