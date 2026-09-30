# EPIC INDEX

## Epic Metadata

### Epic Title
EPIC-001 — Akun & Keamanan

### Priority
High (Must Have)

### Owner
Warsono

### Target Release / Timeline
Sprint 1 (8–21 Okt 2026), milestone M3 Core Recording Ready

## 1. Overview

### Epic Summary
Data keuangan adalah data pribadi yang sensitif. Epic ini menyediakan registrasi akun, login, dan logout, sehingga setiap pengguna memiliki ruang data sendiri dan data keuangannya hanya bisa diakses oleh pemiliknya.

### Business Objective
Menjadi fondasi seluruh fitur MVP. Tanpa akun, transaksi (EPIC-002), anggaran (EPIC-003), dan laporan (EPIC-004) tidak bisa dipisahkan per pengguna. Epic ini juga memenuhi kebutuhan non-fungsional keamanan di BRD §6 (wajib login dan isolasi data).

### Target Users
- Individu yang ingin mencatat keuangan pribadinya (pengguna baru dan pengguna yang kembali)

### Success Metrics
- Pengguna baru dapat mendaftar dan mulai mencatat dalam waktu < 1 menit.
- Tidak ada data keuangan yang dapat diakses tanpa login atau oleh pengguna lain.

## 2. Scope

### Scope / Key Capabilities
- Registrasi akun dengan nama, email, dan password (FEAT-001)
- Kategori bawaan disiapkan otomatis untuk akun baru
- Login dan logout, dengan sesi yang tetap aktif selama 7 hari saat dipakai (FEAT-002)
- Perlindungan halaman: pengguna yang belum login diarahkan ke halaman login

### Out of Scope
- Lupa password / reset password
- Verifikasi email
- Login dengan Google atau akun media sosial lainnya
- Ubah profil, ubah password, dan hapus akun
- Autentikasi dua faktor (2FA)

## 3. Delivery Considerations

### Assumptions
- Satu akun dipakai oleh satu orang (BRD §7.2).
- Email dipakai sebagai identitas login dan bersifat unik.

### Dependencies
- ITA: mekanisme autentikasi dan data model User/Session (`docs/project/03-ITA.md` §4.2, §6).
- Environment staging dengan HTTPS sudah siap (PEP D01).

### Risks
- Tanpa fitur lupa password, pengguna yang lupa password tidak bisa memulihkan akunnya sendiri. Untuk MVP personal, pemulihan dilakukan manual oleh admin server.

## 4. Execution

### User Stories
| Story | Story File | Design File | Testing File | PM Sync |
|-------|------------|-------------|--------------|---------|
| E01-US01 Registrasi akun | [`e01-us01--registrasi-akun---story.md`](e01-us01--registrasi-akun---story.md) | [`e01-us01--registrasi-akun---design.md`](e01-us01--registrasi-akun---design.md) | [`e01-us01--registrasi-akun---testing.md`](e01-us01--registrasi-akun---testing.md) | Not synced |
| E01-US02 Login & logout | [`e01-us02--login-logout---story.md`](e01-us02--login-logout---story.md) | [`e01-us02--login-logout---design.md`](e01-us02--login-logout---design.md) | [`e01-us02--login-logout---testing.md`](e01-us02--login-logout---testing.md) | Not synced |

### Acceptance Criteria / Epic Completion Criteria
- Pengguna baru dapat mendaftar dan langsung masuk ke Beranda dengan kategori bawaan sudah tersedia.
- Pengguna terdaftar dapat login dan logout dari HP maupun desktop.
- Semua halaman selain login dan registrasi tidak dapat diakses tanpa login.
- Tidak ada pengguna yang dapat melihat atau mengubah data milik pengguna lain.

---

<!--
FILE LOCATION: docs/features/phase-01-mvp/e-01---akun-keamanan/index.md

RELATED FILES:
- e01-us01--registrasi-akun---story.md
- e01-us01--registrasi-akun---design.md
- e01-us01--registrasi-akun---testing.md
- e01-us02--login-logout---story.md
- e01-us02--login-logout---design.md
- e01-us02--login-logout---testing.md
-->
