# STORY TESTING

## Related Story

- Story: `e02-us05--kelola-kategori---story.md`
- Design: `e02-us05--kelola-kategori---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Akses halaman Kategori dari menu akun
- Tambah, ubah nama/ikon, arsipkan, aktifkan kembali, dan hapus kategori
- Validasi nama (wajib, panjang, unik per jenis tanpa membedakan huruf besar/kecil)
- Aturan minimal 1 kategori aktif per jenis
- Dampak arsip ke form transaksi, transaksi lama, dan filter daftar
- Isolasi kategori antar pengguna

Out of Scope:
- Sub-kategori, urutan manual, merge kategori, ubah jenis kategori
- Dampak arsip terhadap anggaran (diuji di EPIC-003)

## Gherkin Scenarios

```gherkin
Feature: Kelola kategori

  Background:
    Given saya sudah login sebagai "budi@example.com" dengan kategori bawaan
    And saya memiliki 12 transaksi dengan kategori "Makan & Minum"

  @happy-path @smoke
  Scenario: Menambah kategori pengeluaran baru
    When saya membuka menu akun dan memilih "Kategori"
    And saya menekan "Tambah kategori" pada tab "Pengeluaran"
    And saya mengisi nama "Kopi"
    And saya memilih ikon "☕"
    And saya menekan tombol "Simpan"
    Then saya melihat notifikasi "Kategori ditambahkan"
    And kategori "Kopi" muncul di daftar kategori pengeluaran aktif
    And kategori "Kopi" tersedia di form catat pengeluaran

  @happy-path
  Scenario: Mengubah nama dan ikon kategori yang sudah dipakai
    When saya membuka halaman Kategori
    And saya membuka kategori "Makan & Minum"
    And saya mengubah nama menjadi "Makan"
    And saya menekan tombol "Simpan"
    Then saya melihat notifikasi "Kategori diperbarui"
    And ke-12 transaksi sebelumnya menampilkan kategori "Makan"

  @happy-path
  Scenario: Mengarsipkan kategori yang sudah dipakai
    When saya membuka kategori "Makan & Minum"
    Then saya tidak melihat tombol "Hapus kategori"
    And saya melihat teks "Kategori ini dipakai di 12 transaksi"
    When saya menekan "Arsipkan kategori"
    Then saya melihat notifikasi "Kategori diarsipkan"
    And kategori "Makan & Minum" tampil di bagian "Diarsipkan"
    And kategori "Makan & Minum" tidak tersedia di form catat pengeluaran
    And transaksi lama tetap menampilkan kategori "Makan & Minum"
    And kategori "Makan & Minum" tetap tersedia di filter daftar transaksi

  @happy-path
  Scenario: Mengaktifkan kembali kategori terarsip
    Given kategori "Makan & Minum" sudah diarsipkan
    When saya menekan "Aktifkan kembali" pada kategori "Makan & Minum"
    Then saya melihat notifikasi "Kategori diaktifkan"
    And kategori "Makan & Minum" tersedia lagi di form catat pengeluaran

  @happy-path
  Scenario: Menghapus kategori yang belum pernah dipakai
    Given saya memiliki kategori pengeluaran "Kopi" tanpa transaksi
    When saya membuka kategori "Kopi"
    And saya menekan "Hapus kategori"
    Then saya melihat konfirmasi "Hapus kategori Kopi?"
    When saya menekan tombol "Hapus" pada konfirmasi
    Then saya melihat notifikasi "Kategori dihapus"
    And kategori "Kopi" tidak ada di daftar aktif maupun terarsip

  @validation
  Scenario Outline: Nama kategori tidak valid
    When saya menambah kategori pengeluaran dengan nama "<nama>" dan ikon "☕"
    Then saya melihat pesan "<pesan>"
    And kategori tidak tersimpan

    Examples:
      | nama                                  | pesan                         |
      |                                       | Nama wajib diisi              |
      | makan & minum                         | Nama kategori sudah ada       |
      | Nama kategori yang sangat panjang sekali | Nama maksimal 30 karakter  |

  @validation
  Scenario: Nama sama boleh dipakai di jenis berbeda
    When saya menambah kategori pemasukan dengan nama "Makan & Minum" dan ikon "🍜"
    Then saya melihat notifikasi "Kategori ditambahkan"

  @validation
  Scenario: Nama yang sudah dipakai kategori terarsip tidak boleh dipakai lagi
    Given kategori pengeluaran "Game" sudah diarsipkan
    When saya menambah kategori pengeluaran dengan nama "Game" dan ikon "🎮"
    Then saya melihat pesan "Nama kategori sudah ada"

  @validation
  Scenario: Tidak bisa mengarsipkan kategori aktif terakhir
    Given saya hanya memiliki 1 kategori pemasukan aktif yaitu "Gaji"
    When saya membuka kategori "Gaji" pada tab "Pemasukan"
    And saya menekan "Arsipkan kategori"
    Then saya melihat pesan "Minimal harus ada 1 kategori aktif"
    And kategori "Gaji" tetap aktif

  @error-handling
  Scenario: Gagal menyimpan kategori
    Given server gagal merespons
    When saya menambah kategori pengeluaran dengan nama "Kopi" dan ikon "☕"
    Then saya melihat pesan "Gagal menyimpan. Coba lagi."
    And data form tetap ada

  @security
  Scenario: Kategori tidak terlihat oleh pengguna lain
    Given "budi@example.com" menambah kategori "Kopi"
    When saya logout dan login sebagai "ani@example.com"
    And saya membuka halaman Kategori
    Then kategori "Kopi" tidak muncul
    And kategori "Kopi" tidak tersedia di form catat pengeluaran milik "ani@example.com"

  @security
  Scenario: Tidak bisa mengubah atau memakai kategori milik pengguna lain lewat request langsung
    Given "ani@example.com" memiliki kategori dengan id "cat-ani-1"
    When "budi@example.com" mengirim permintaan ubah, arsipkan, atau hapus untuk "cat-ani-1"
    Then permintaan ditolak dengan pesan "Kategori tidak ditemukan"
    When "budi@example.com" mencatat transaksi dengan kategori "cat-ani-1"
    Then permintaan ditolak dan transaksi tidak tersimpan
```

## QA Automation Notes

- Suggested test type: Playwright (web) untuk UI; skenario request langsung di integration test (Vitest memanggil Server Action dengan session user lain)
- Suggested priority: P2 (Should Have). Skenario `@smoke` tetap dijalankan jika fitur sudah dirilis
- Key selectors or interaction targets (gunakan `data-testid`):
  - `account-menu-button`, `account-menu-categories` (UX-01)
  - `category-tab-expense` / `category-tab-income` (UX-02)
  - `category-add-button` (UX-03)
  - `category-name-input` (UX-04), `category-icon-option-<n>` (UX-09), `category-submit-button`
  - `category-row-<slug>` (UX-05)
  - `category-archive-button` (UX-06), `category-delete-button` (UX-07), `confirm-delete-button`
  - `category-restore-button-<slug>` (UX-08)
  - `category-archived-section`
- Assertions:
  - Keberadaan kategori di daftar aktif/terarsip dan di form transaksi
  - Tampilan transaksi lama setelah kategori diubah/diarsipkan
  - Tombol hapus tidak tersedia untuk kategori yang punya transaksi

## Test Data

- `budi@example.com` dengan kategori bawaan dan 12 transaksi "Makan & Minum" (seed)
- Seed khusus: akun dengan hanya 1 kategori pemasukan aktif untuk skenario "kategori aktif terakhir"
- `ani@example.com` dengan kategori ber-id tetap `cat-ani-1`

## Open QA Questions

- Apakah jumlah transaksi di halaman Kategori dihitung dari semua waktu atau hanya bulan berjalan? (Asumsi: semua waktu.)

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-02---pencatatan-transaksi/e02-us05--kelola-kategori---testing.md

RELATED FILES:
- e02-us05--kelola-kategori---story.md
- e02-us05--kelola-kategori---design.md
-->
