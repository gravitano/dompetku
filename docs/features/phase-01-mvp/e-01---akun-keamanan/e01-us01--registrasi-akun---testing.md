# STORY TESTING

## Related Story

- Story: `e01-us01--registrasi-akun---story.md`
- Design: `e01-us01--registrasi-akun---design.md`
- Epic: `index.md`
- Status: Draft
- Owner: Warsono

## Test Scope

In Scope:
- Registrasi dengan data valid, auto-login, dan pengalihan ke Beranda
- Kategori bawaan tersedia untuk akun baru
- Validasi nama, email, password, dan konfirmasi password
- Email duplikat (termasuk beda huruf besar/kecil)
- Pencegahan akun ganda dan penanganan gagal daftar
- Tampilan di viewport HP dan desktop

Out of Scope:
- Verifikasi email, login dengan Google, reset password
- Login dan logout (E01-US02)

## Gherkin Scenarios

```gherkin
Feature: Registrasi akun

  Background:
    Given saya belum login
    And saya berada di halaman registrasi

  @happy-path @smoke
  Scenario: Registrasi berhasil lalu otomatis masuk ke Beranda
    When saya mengisi nama "Citra Lestari"
    And saya mengisi email "citra@example.com"
    And saya mengisi password "rahasia123"
    And saya mengisi konfirmasi password "rahasia123"
    And saya menekan tombol "Daftar"
    Then saya berada di halaman Beranda
    And saya melihat notifikasi "Selamat datang, Citra Lestari!"
    And saya melihat nama "Citra Lestari" di menu akun

  @happy-path
  Scenario: Akun baru memiliki kategori bawaan
    Given saya baru saja mendaftar sebagai "citra@example.com"
    When saya membuka form "Catat Pengeluaran"
    Then saya melihat kategori "Makan & Minum", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Kesehatan", dan "Lainnya"
    And akun saya belum memiliki transaksi

  @validation
  Scenario Outline: Password tidak memenuhi syarat
    When saya mengisi data registrasi valid dengan password "<password>"
    And saya menekan tombol "Daftar"
    Then saya melihat pesan "Password belum memenuhi syarat"
    And akun tidak dibuat

    Examples:
      | password  |
      | abc12     |
      | abcdefgh  |
      | 12345678  |

  @validation
  Scenario: Konfirmasi password tidak sama
    When saya mengisi password "rahasia123"
    And saya mengisi konfirmasi password "rahasia124"
    And saya menekan tombol "Daftar"
    Then saya melihat pesan "Konfirmasi password tidak sama"
    And field nama dan email tetap terisi

  @validation
  Scenario Outline: Field wajib dan format email
    When saya mengisi data registrasi valid kecuali <field> diisi "<nilai>"
    And saya menekan tombol "Daftar"
    Then saya melihat pesan "<pesan>"

    Examples:
      | field | nilai         | pesan                     |
      | nama  |               | Nama wajib diisi          |
      | email |               | Email wajib diisi         |
      | email | budi@example  | Format email tidak valid  |

  @validation
  Scenario Outline: Email sudah terdaftar
    Given akun "budi@example.com" sudah terdaftar
    When saya mengisi data registrasi valid dengan email "<email>"
    And saya menekan tombol "Daftar"
    Then saya melihat pesan "Email sudah terdaftar. Silakan masuk."
    And akun baru tidak dibuat

    Examples:
      | email             |
      | budi@example.com  |
      | Budi@Example.COM  |

  @error-handling
  Scenario: Tombol Daftar ditekan dua kali
    When saya mengisi data registrasi valid dengan email "dimas@example.com"
    And saya menekan tombol "Daftar" dua kali dengan cepat
    Then hanya satu akun "dimas@example.com" yang dibuat

  @error-handling
  Scenario: Gagal mendaftar karena koneksi terputus
    Given koneksi ke server terputus
    When saya mengisi data registrasi valid
    And saya menekan tombol "Daftar"
    Then saya melihat pesan "Gagal mendaftar. Periksa koneksi lalu coba lagi."
    And field nama dan email tetap terisi

  @security
  Scenario: Pengguna yang sudah login tidak bisa membuka halaman registrasi
    Given saya sudah login sebagai "budi@example.com"
    When saya membuka halaman registrasi
    Then saya diarahkan ke halaman Beranda
```

## QA Automation Notes

- Suggested test type: Playwright (web), dijalankan di viewport HP (390×844) dan desktop (1280×800)
- Suggested priority: P1. Skenario `@smoke` masuk `test/web/smoke/`
- Key selectors or interaction targets (gunakan `data-testid`):
  - `register-name-input` (UX-01)
  - `register-email-input` (UX-02)
  - `register-password-input`, `register-password-toggle` (UX-03)
  - `register-password-confirm-input` (UX-04)
  - `register-submit-button` (UX-05)
  - `register-login-link` (UX-06)
  - `account-menu` (nama pengguna di header)
- Assertions:
  - URL setelah sukses adalah Beranda (`/`)
  - Toast sapaan tampil dengan nama yang benar
  - 7 kategori pengeluaran dan 4 kategori pemasukan bawaan tersedia
  - Jumlah akun dengan email yang sama tetap 1 (skenario double submit dan duplikat)
  - Gagal daftar disimulasikan dengan `page.route` (abort request) atau `context.setOffline(true)`
- Gunakan email unik per test run (misal `citra+<timestamp>@example.com`) agar test tidak saling bentrok

## Test Data

- Akun `budi@example.com` sudah terdaftar (fixture `test/web/fixtures/`) untuk skenario email duplikat
- Email baru yang dibuat dinamis per test run untuk skenario registrasi berhasil

## Open QA Questions

- Apakah pesan "Email sudah terdaftar" dapat diterima dari sisi keamanan (email enumeration)? Untuk MVP personal dianggap wajar demi kejelasan bagi pengguna.
- Apakah perlu rate limit pada registrasi untuk mencegah pembuatan akun massal?

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us01--registrasi-akun---testing.md

RELATED FILES:
- e01-us01--registrasi-akun---story.md
- e01-us01--registrasi-akun---design.md
-->
