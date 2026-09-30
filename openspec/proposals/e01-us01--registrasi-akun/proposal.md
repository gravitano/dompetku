---
haie_story: docs/features/phase-01-mvp/e-01---akun-keamanan/e01-us01--registrasi-akun---story.md
status: in-progress
branch: dev/e01-us01--registrasi-akun
---

# E01-US01 — Registrasi akun

## Why

Calon pengguna butuh akun pribadi agar data keuangannya terisolasi (BRD FEAT-001, §6).
Acceptance criteria (story §3):

1. Tautan "Daftar" di `/login` ↔ tautan "Masuk" di `/register`.
2. Form Nama (wajib, ≤ 50), Email (wajib, format valid), Password, Konfirmasi Password.
3. Password ≥ 8 karakter, minimal 1 huruf + 1 angka; syarat tampil sebelum mengetik.
4. Konfirmasi password harus sama.
5. Email terdaftar (case-insensitive) → "Email sudah terdaftar. Silakan masuk." + tautan login; akun tidak dibuat.
6. Error per field, data lain tidak hilang; password dikosongkan hanya saat error sistem.
7. Kategori bawaan (7 pengeluaran + 4 pemasukan) dibuat otomatis.
8. Auto-login → Beranda dengan sapaan "Selamat datang, <nama>!".
9. Tombol "Daftar" tidak bisa ditekan dua kali (tidak ada akun ganda).
10. Error sistem/koneksi → pesan error, bisa coba lagi.
11. Password tidak pernah ditampilkan/dikirim balik; ikon mata untuk show/hide.
12. User yang sudah login membuka `/register` → diarahkan ke Beranda.

## What Changes

- `src/modules/auth/schema.ts` — Zod `registerSchema` (dipakai client & server), aturan password, pesan error.
- `src/modules/auth/registration.ts` — `createAccountWithDefaults()`: satu `prisma.$transaction` membuat
  `users` + `accounts` (credential, hash scrypt `better-auth/crypto`) + kategori bawaan (`seedDefaultCategories(userId, tx)`).
  Email duplikat (pre-check + unique constraint P2002) → `EmailTakenError`.
- `src/modules/auth/actions.ts` — Server Action `registerAction()`: validasi Zod, rate limit per IP, buat akun,
  auto-login via `auth.api.signInEmail` (cookie lewat plugin `nextCookies`), lalu `redirect("/?welcome=1")`.
  Mengembalikan `ActionResult` untuk error (`VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_ERROR`).
- `src/lib/rate-limit.ts` — fixed-window limiter in-memory.
- `src/lib/auth.ts` — `disabledPaths: ["/sign-up/email"]` agar registrasi hanya lewat Server Action (selalu dengan kategori bawaan).
- `src/components/auth/` — `register-form.tsx`, `password-input.tsx` (ikon mata), `password-requirements.tsx` (checklist real-time), `welcome-toast.tsx`.
- `src/app/(auth)/register/page.tsx` — form + redirect ke `/` bila sudah login. `src/app/(auth)/login/page.tsx` — tautan "Daftar".
- `src/app/(app)/layout.tsx` — pasang `WelcomeToast` (baca `?welcome=1`, tampilkan toast, bersihkan URL).
- Tidak ada perubahan skema Prisma.

## Decisions (open questions)

- **Atomicity kategori bawaan:** `databaseHooks.user.create.after` di better-auth 1.7 dijalankan _setelah commit_
  (`queueAfterTransactionHook`), jadi tidak atomic. Dipilih Server Action yang membuat user + account + kategori dalam
  satu transaksi Prisma (pola sama dengan `prisma/seed.ts`), lalu login via `auth.api.signInEmail`. Endpoint HTTP
  `/api/auth/sign-up/email` dinonaktifkan agar tidak ada user tanpa kategori.
- **Konfirmasi Password (design):** tetap dipakai, sesuai AC 2 & 4.
- **Onboarding tour (design):** tidak di MVP; Beranda cukup toast sapaan.
- **Email enumeration (QA):** pesan "Email sudah terdaftar" dipertahankan (MVP personal, demi kejelasan).
- **Rate limit (QA):** Server Action tidak melewati rate limiter better-auth, jadi dibuat limiter sendiri: 5 percobaan/menit/IP,
  aktif di `NODE_ENV=production` (dev/E2E lokal tidak dibatasi). In-memory cukup karena 1 container per environment.
- **Toast sapaan:** Server Action me-redirect ke `/?welcome=1`; `WelcomeToast` di layout app membaca nama dari session.
- Jika auto-login gagal setelah akun dibuat (jarang), user diarahkan ke `/login?registered=1`.

## Validation

Skenario `e01-us01--registrasi-akun---testing.md` → `test/web/features/e01-us01-registrasi-akun.spec.ts` (mobile 390×844 & desktop 1280×800):

- @smoke registrasi berhasil → Beranda + toast + nama di menu akun (juga di `test/web/smoke/`).
- Kategori bawaan 7 + 4 & 0 transaksi (dicek via DB; bagian form "Catat Pengeluaran" menunggu E02).
- Password tidak memenuhi syarat (3 contoh), konfirmasi tidak sama, field wajib & format email.
- Email terdaftar (termasuk beda huruf besar/kecil), double submit → 1 akun, koneksi terputus → banner error.
- User login membuka `/register` → Beranda.

Unit test (Vitest): `registerSchema`, `createAccountWithDefaults`, `registerAction`, `rate-limit`.
