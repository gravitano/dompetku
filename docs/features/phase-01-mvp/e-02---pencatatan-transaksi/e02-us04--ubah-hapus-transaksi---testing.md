# STORY TESTING

## Related Story

- Story: `e02-us04--ubah-hapus-transaksi---story.md`
- Design: `e02-us04--ubah-hapus-transaksi---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Membuka detail transaksi dari daftar dan Beranda
- Mengubah nominal, kategori, tanggal, catatan, dan jenis
- Dampak perubahan/hapus terhadap daftar dan total ringkasan
- Konfirmasi hapus, konfirmasi buang perubahan, dan penanganan gagal
- Transaksi dengan kategori terarsip
- Akses transaksi milik pengguna lain

Out of Scope:
- Undo, hapus massal, riwayat perubahan
- Validasi detail yang identik dengan E02-US01 (cukup 1 sampel)

## Gherkin Scenarios

```gherkin
Feature: Ubah dan hapus transaksi

  Background:
    Given hari ini adalah "30 September 2026"
    And saya sudah login sebagai "budi@example.com"
    And saya memiliki pengeluaran "Makan siang" kategori "Makan & Minum" sebesar Rp 25.000 tanggal "2026-09-30"
    And saya berada di tab "Transaksi"

  @happy-path @smoke
  Scenario: Mengubah nominal transaksi
    When saya membuka transaksi "Makan siang"
    And saya mengubah nominal menjadi "30000"
    And saya menekan tombol "Simpan perubahan"
    Then saya melihat notifikasi "Perubahan tersimpan"
    And transaksi "Makan siang" menampilkan "− Rp 30.000"
    And total "Pengeluaran" di ringkasan bertambah Rp 5.000

  @happy-path
  Scenario: Memindahkan transaksi ke bulan sebelumnya
    When saya membuka transaksi "Makan siang"
    And saya mengubah tanggal menjadi "2026-08-31"
    And saya menekan tombol "Simpan perubahan"
    Then transaksi "Makan siang" tidak lagi muncul di periode "September 2026"
    When saya menekan tombol bulan sebelumnya
    Then transaksi "Makan siang" muncul di periode "Agustus 2026"

  @happy-path
  Scenario: Mengubah jenis transaksi menjadi pemasukan
    When saya membuka transaksi "Makan siang"
    And saya memilih jenis "Pemasukan"
    Then tidak ada kategori yang terpilih
    When saya memilih kategori "Lainnya"
    And saya menekan tombol "Simpan perubahan"
    Then transaksi "Makan siang" menampilkan "+ Rp 25.000"

  @happy-path @smoke
  Scenario: Menghapus transaksi
    When saya membuka transaksi "Makan siang"
    And saya menekan tombol "Hapus transaksi"
    Then saya melihat konfirmasi "Hapus transaksi ini?" dengan detail "Rp 25.000"
    When saya menekan tombol "Hapus" pada konfirmasi
    Then saya melihat notifikasi "Transaksi dihapus"
    And transaksi "Makan siang" tidak muncul di daftar
    And total "Pengeluaran" di ringkasan berkurang Rp 25.000

  @happy-path
  Scenario: Membatalkan penghapusan
    When saya membuka transaksi "Makan siang"
    And saya menekan tombol "Hapus transaksi"
    And saya menekan tombol "Batal" pada konfirmasi
    Then detail transaksi masih terbuka
    And transaksi "Makan siang" masih ada

  @validation
  Scenario: Tombol simpan nonaktif tanpa perubahan
    When saya membuka transaksi "Makan siang"
    Then tombol "Simpan perubahan" tidak aktif

  @validation
  Scenario: Nominal tidak valid saat mengubah
    When saya membuka transaksi "Makan siang"
    And saya mengubah nominal menjadi "0"
    And saya menekan tombol "Simpan perubahan"
    Then saya melihat pesan "Nominal harus lebih dari 0"
    And transaksi "Makan siang" tetap bernilai Rp 25.000

  @validation
  Scenario: Menutup detail dengan perubahan yang belum disimpan
    When saya membuka transaksi "Makan siang"
    And saya mengubah catatan menjadi "Makan malam"
    And saya menekan tombol "✕"
    Then saya melihat konfirmasi "Buang perubahan?"

  @validation
  Scenario: Transaksi dengan kategori terarsip
    Given kategori "Makan & Minum" sudah diarsipkan
    When saya membuka transaksi "Makan siang"
    Then kategori "Makan & Minum" tampil terpilih dengan label "Diarsipkan"
    When saya mengubah nominal menjadi "27000"
    And saya menekan tombol "Simpan perubahan"
    Then saya melihat notifikasi "Perubahan tersimpan"

  @error-handling
  Scenario: Gagal menyimpan perubahan
    Given server gagal merespons
    When saya membuka transaksi "Makan siang"
    And saya mengubah nominal menjadi "30000"
    And saya menekan tombol "Simpan perubahan"
    Then saya melihat pesan "Gagal menyimpan perubahan. Coba lagi."
    And field nominal tetap berisi "Rp 30.000"

  @error-handling
  Scenario: Gagal menghapus transaksi
    Given server gagal merespons
    When saya menghapus transaksi "Makan siang" dan mengonfirmasi
    Then saya melihat pesan "Gagal menghapus transaksi. Coba lagi."
    And transaksi "Makan siang" masih ada di daftar

  @security
  Scenario: Tidak bisa membuka transaksi milik pengguna lain
    Given "ani@example.com" memiliki transaksi dengan id "trx-ani-1"
    When saya membuka URL detail transaksi "trx-ani-1" sebagai "budi@example.com"
    Then saya melihat pesan "Transaksi tidak ditemukan"
    And transaksi "trx-ani-1" milik "ani@example.com" tidak berubah

  @security
  Scenario: Tidak bisa mengubah atau menghapus transaksi milik pengguna lain lewat request langsung
    Given "ani@example.com" memiliki transaksi dengan id "trx-ani-1"
    When "budi@example.com" mengirim permintaan ubah dan hapus untuk "trx-ani-1"
    Then permintaan ditolak dengan pesan "Transaksi tidak ditemukan"
    And transaksi "trx-ani-1" tetap ada tanpa perubahan
```

## QA Automation Notes

- Suggested test type: Playwright (web) untuk UI; skenario request langsung diuji di level integration test (Vitest memanggil Server Action dengan session user lain)
- Suggested priority: P1. Skenario `@smoke` masuk `apps/test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `transaction-row-<id>`
  - `transaction-amount-input`, `transaction-date-picker`, `transaction-note-input` (UX-01)
  - `transaction-type-toggle-expense` / `transaction-type-toggle-income` (UX-02)
  - `transaction-update-button` (UX-03)
  - `transaction-delete-button` (UX-04), `confirm-delete-button`, `confirm-cancel-button` (UX-05)
  - `transaction-cancel-button` (UX-06)
  - `category-archived-badge`
- Assertions:
  - Nilai baris & ringkasan setelah ubah/hapus
  - Transaksi tidak ada di DB setelah dihapus (via UI: tidak muncul setelah reload)
  - Error disimulasikan dengan `page.route` (status 500)

## Test Data

- `budi@example.com` dengan transaksi "Makan siang" (reset via seed sebelum tiap test)
- `ani@example.com` dengan transaksi ber-id tetap `trx-ani-1` (fixture)
- Kategori terarsip disiapkan via seed (tanpa bergantung pada E02-US05)

## Open QA Questions

- Apakah tampilan transaksi yang tidak ditemukan dibedakan antara "sudah dihapus" dan "milik pengguna lain"? (Rekomendasi: tidak, keduanya "Transaksi tidak ditemukan" demi keamanan.)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us04--ubah-hapus-transaksi---testing.md

RELATED FILES:
- e02-us04--ubah-hapus-transaksi---story.md
- e02-us04--ubah-hapus-transaksi---design.md
-->
