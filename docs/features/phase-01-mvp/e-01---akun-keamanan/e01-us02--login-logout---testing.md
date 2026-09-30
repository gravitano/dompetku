# STORY TESTING

## Related Story

- Story: `e01-us02--login-logout---story.md`
- Design: `e01-us02--login-logout---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Login berhasil dan pengalihan ke Beranda atau halaman tujuan
- Pesan error generik untuk kredensial salah
- Pembatasan percobaan login (5x gagal dalam 15 menit)
- Perlindungan halaman untuk pengguna yang belum login
- Sesi tetap aktif setelah browser ditutup
- Logout, pencabutan sesi, dan perilaku tombol back
- Tampilan di viewport HP dan desktop

Out of Scope:
- Registrasi (E01-US01), reset password, login dengan Google, 2FA
- Kedaluwarsa sesi setelah 7 hari (diverifikasi manual atau lewat unit test, bukan E2E)

## Gherkin Scenarios

```gherkin
Feature: Login & logout

  Background:
    Given akun "budi@example.com" dengan nama "Budi Santoso" sudah terdaftar

  @happy-path @smoke
  Scenario: Login berhasil
    Given saya belum login
    And saya berada di halaman login
    When saya mengisi email "budi@example.com"
    And saya mengisi password yang benar
    And saya menekan tombol "Masuk"
    Then saya berada di halaman Beranda
    And saya melihat nama "Budi Santoso" di menu akun

  @happy-path
  Scenario: Email tidak membedakan huruf besar dan kecil
    Given saya berada di halaman login
    When saya login dengan email "Budi@Example.COM" dan password yang benar
    Then saya berada di halaman Beranda

  @happy-path
  Scenario: Kembali ke halaman tujuan setelah login
    Given saya belum login
    When saya membuka halaman "Anggaran"
    Then saya diarahkan ke halaman login
    When saya login sebagai "budi@example.com"
    Then saya berada di halaman "Anggaran"

  @happy-path
  Scenario: Sesi tetap aktif setelah browser ditutup
    Given saya sudah login sebagai "budi@example.com"
    When saya menutup lalu membuka kembali browser
    And saya membuka DompetKu
    Then saya berada di halaman Beranda tanpa perlu login lagi

  @happy-path @smoke
  Scenario: Logout
    Given saya sudah login sebagai "budi@example.com"
    When saya membuka menu akun
    And saya memilih "Keluar"
    Then saya berada di halaman login
    And saya melihat pesan "Anda telah keluar"

  @validation
  Scenario Outline: Kredensial salah menampilkan pesan umum
    Given saya berada di halaman login
    When saya mengisi email "<email>"
    And saya mengisi password "<password>"
    And saya menekan tombol "Masuk"
    Then saya melihat pesan "Email atau password salah"
    And field email tetap berisi "<email>"
    And field password kosong

    Examples:
      | email               | password      |
      | budi@example.com    | salahpass123  |
      | tidakada@example.com| rahasia123    |

  @validation
  Scenario: Field wajib diisi
    Given saya berada di halaman login
    When saya menekan tombol "Masuk" tanpa mengisi apa pun
    Then saya melihat pesan "Email wajib diisi"
    And saya melihat pesan "Password wajib diisi"

  @security
  Scenario: Terlalu banyak percobaan login gagal
    Given saya berada di halaman login
    And saya sudah 5 kali gagal login dengan email "budi@example.com" dalam 15 menit terakhir
    When saya login dengan email "budi@example.com" dan password yang benar
    Then saya melihat pesan "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
    And saya tetap berada di halaman login

  @security
  Scenario: Halaman terproteksi tidak dapat diakses tanpa login
    Given saya belum login
    When saya membuka halaman "Transaksi"
    Then saya diarahkan ke halaman login

  @security
  Scenario: Tombol back setelah logout tidak menampilkan data
    Given saya sudah login sebagai "budi@example.com"
    And saya berada di halaman "Transaksi"
    When saya logout
    And saya menekan tombol back di browser
    Then saya berada di halaman login
    And tidak ada data transaksi yang tampil

  @security
  Scenario: Pengguna yang sudah login tidak melihat halaman login
    Given saya sudah login sebagai "budi@example.com"
    When saya membuka halaman login
    Then saya diarahkan ke halaman Beranda

  @error-handling
  Scenario: Gagal login karena koneksi terputus
    Given saya berada di halaman login
    And koneksi ke server terputus
    When saya login dengan email "budi@example.com" dan password yang benar
    Then saya melihat pesan "Gagal masuk. Periksa koneksi lalu coba lagi."
```

## QA Automation Notes

- Suggested test type: Playwright (web), dijalankan di viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `login-email-input` (UX-01)
  - `login-password-input`, `login-password-toggle` (UX-02)
  - `login-submit-button` (UX-03)
  - `login-register-link` (UX-04)
  - `auth-alert` (UX-05)
  - `account-menu` (UX-06)
  - `account-menu-logout` (UX-07)
- Assertions:
  - URL setelah login (`/` atau halaman tujuan) dan setelah logout (`/login`)
  - Isi banner sesuai skenario
  - Cookie sesi ada setelah login dan tidak berlaku setelah logout
  - Sesi bertahan: simpan `storageState`, buat browser context baru dari state tersebut, lalu pastikan tetap login
  - Gagal login disimulasikan dengan `page.route` (abort request) atau `context.setOffline(true)`
- Gunakan fixture login (`storageState`) untuk test fitur lain agar tidak login lewat UI di setiap test
- Skenario rate limit sebaiknya memakai akun khusus (misal `lock@example.com`) agar tidak mengunci akun yang dipakai test lain

## Test Data

- Akun `budi@example.com` (nama "Budi Santoso") dan `ani@example.com`, password dari fixture `test/web/fixtures/`
- Akun khusus `lock@example.com` untuk skenario rate limit

## Open QA Questions

- Apakah batas 5x gagal dalam 15 menit dihitung per email, per IP, atau keduanya?
- Bagaimana prosedur pemulihan jika pengguna lupa password selama fitur reset password belum ada (manual oleh admin server)?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us02--login-logout---testing.md

RELATED FILES:
- e01-us02--login-logout---story.md
- e01-us02--login-logout---design.md
-->
