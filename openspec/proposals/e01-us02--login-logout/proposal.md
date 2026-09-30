---
haie_story: docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us02--login-logout---story.md
status: proposed
branch: dev/e01-us02--login-logout
---

# E01-US02 — Login & logout

## Why

Pengguna terdaftar harus bisa masuk, tetap masuk selama aktif, dan keluar kapan saja agar data keuangannya hanya
bisa diakses olehnya (BRD FEAT-002, §6). Acceptance criteria (story §3):

1. Halaman login: Email (wajib), Password (wajib, ikon mata), tombol **Masuk**, tautan "Belum punya akun? **Daftar**".
2. Kredensial benar → masuk ke Beranda. Email tidak case-sensitive.
3. Kredensial salah → pesan umum "Email atau password salah" (tidak membocorkan email terdaftar atau tidak).
4. 5x gagal dalam 15 menit untuk email yang sama → ditolak sementara: "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
5. Login gagal → email tetap, password dikosongkan.
6. Belum login membuka halaman selain login/registrasi → ke `/login`; setelah login kembali ke halaman tujuan.
7. Sesi 7 hari sejak aktivitas terakhir (sliding), bertahan setelah browser ditutup.
8. Sudah login membuka `/login` → ke Beranda.
9. Menu akun di header kanan atas: nama pengguna + **Keluar**.
10. Keluar → `/login` dengan pesan "Anda telah keluar"; sesi dicabut.
11. Setelah keluar, tombol _back_ tidak menampilkan data keuangan.
12. Tombol Masuk tidak bisa ditekan dua kali; error sistem/koneksi → pesan error, bisa coba lagi.

## What Changes

- `src/modules/auth/schema.ts` — `loginSchema` (Zod isomorfik) + `LOGIN_MESSAGES`.
- `src/modules/auth/callback-url.ts` — `sanitizeCallbackUrl()` (hanya path internal, cegah open redirect) +
  `buildLoginUrl()`; dipakai proxy, halaman login, dan Server Action.
- `src/modules/auth/login-lockout.ts` — penghitung gagal login per email (5x / 15 menit, in-memory).
- `src/lib/auth.ts` — `hooks.before/after` better-auth di `/sign-in/email`: tolak (429, `LOGIN_LOCKED`) bila terkunci,
  catat gagal saat 401, reset saat berhasil. Hook berjalan baik untuk HTTP `/api/auth/sign-in/email` maupun `auth.api.signInEmail`.
- `src/modules/auth/actions.ts` — Server Action `loginAction()` (validasi → `auth.api.signInEmail` → `redirect(callbackUrl)`)
  dan `logoutAction()` (`auth.api.signOut`).
- `src/lib/action-result.ts` — kode error baru `RATE_LIMITED` (juga dipakai rate limit registrasi).
- `src/proxy.ts` — simpan `callbackUrl` saat redirect ke `/login`; teruskan path asli via header `x-dompetku-path`
  agar `requireUserOrRedirect()` (sesi tidak valid di DB) juga menyertakan `callbackUrl`.
- `src/components/auth/login-form.tsx`, `auth-alert.tsx` — form login + banner (UX-01…UX-05).
- `src/components/layout/account-menu.tsx` — dropdown menu akun (avatar inisial + nama, email, "Kategori" disabled
  untuk E02-US05, **Keluar**) menggantikan `AccountMenuPlaceholder`. `bfcache-guard.tsx` memuat ulang halaman
  yang dipulihkan dari back-forward cache.
- `src/app/(auth)/login/page.tsx` — form, banner `?logout=1` / `?registered=1`, redirect bila sudah login.
- Tidak ada perubahan skema Prisma (tabel `sessions` better-auth sudah ada).

## Decisions (open questions)

- **Lockout per email vs per IP (QA):** penguncian 5x gagal / 15 menit dihitung **per email** (sesuai AC 4), termasuk email
  yang tidak terdaftar (agar respons tidak membocorkan keberadaan akun). Serangan dari satu IP ke banyak email dibatasi
  lapisan lain: rate limiter bawaan better-auth untuk HTTP `/sign-in/email` (10/menit/IP) dan limiter Server Action
  `loginAction` 10/menit/IP (production). Tidak per-IP untuk lockout agar pengguna di NAT/Wi-Fi bersama tidak saling mengunci.
  Login berhasil sebelum batas me-reset penghitung. Penyimpanan in-memory cukup (1 container per environment, ITA §8).
- **Kode error rate limit:** `RATE_LIMITED` (bukan `INTERNAL_ERROR`) untuk lockout login & rate limit registrasi.
- **Konfirmasi logout (design):** tidak ada dialog "Yakin ingin keluar?" — langsung keluar (lebih cepat, aksi mudah dibatalkan dengan login ulang).
- **"Lupa password? Hubungi admin" (design/QA):** tidak ditampilkan di MVP; pemulihan password dilakukan manual oleh admin
  server sampai fitur reset password dibuat (out of scope).
- **Login lewat Server Action:** pola sama dengan registrasi; `nextCookies` menulis cookie. Endpoint HTTP
  `/api/auth/sign-in/email` tetap aktif (dipakai client better-auth & fixture E2E) dan tetap terkena lockout lewat hook.
- **callbackUrl:** hanya path relatif internal (`/…`, bukan `//`, `/\`, skema, atau karakter kontrol) dan bukan `/login`/`/register`
  atau `/api/*`; selain itu fallback ke `/`.
- **Tombol back setelah logout:** logout melakukan navigasi penuh (`window.location.assign`) sehingga router cache client
  dibuang; halaman area login selalu dinamis (`Cache-Control: no-store`) sehingga back memicu request baru → proxy
  redirect ke `/login`. `BfcacheGuard` memuat ulang bila halaman dipulihkan dari bfcache.
- **Sesi:** better-auth database session `expiresIn` 7 hari, `updateAge` 1 hari (sliding); cookie persisten (`Max-Age`).
- **`?registered=1`:** banner info "Akun berhasil dibuat. Silakan masuk." (fallback registrasi E01-US01).

## Validation

Skenario `e01-us02--login-logout---testing.md` → `test/web/features/e01-us02-login-logout.spec.ts` + `test/web/smoke/login.spec.ts`
(mobile 390×844 & desktop 1280×800). Unit test (Vitest): `loginSchema`, `sanitizeCallbackUrl`, lockout, `loginAction`/`logoutAction`,
konfigurasi sesi.
