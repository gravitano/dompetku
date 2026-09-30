# Tasks — E01-US01 Registrasi akun

- [x] Schema Zod registrasi + aturan password (`src/modules/auth/schema.ts`) + unit test
- [x] Rate limiter in-memory (`src/lib/rate-limit.ts`) + unit test
- [x] Transaksi user + account + kategori bawaan (`src/modules/auth/registration.ts`) + unit test
- [x] Server Action `registerAction` (validasi, rate limit, auto-login, redirect) + unit test
- [x] Nonaktifkan `/api/auth/sign-up/email` di better-auth
- [x] Komponen `~/components/auth/*`: form registrasi, password input (ikon mata), checklist syarat, welcome toast
- [x] Halaman `/register` (redirect bila sudah login) + tautan "Daftar" di `/login`
- [x] Toast "Selamat datang, <nama>!" di Beranda
- [x] E2E Playwright + page object `RegisterPage` + helper DB fixture
- [x] Smoke: registrasi berhasil
- [x] Verifikasi: lint, typecheck, format, unit test, build, E2E
