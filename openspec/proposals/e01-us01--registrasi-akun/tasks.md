# Tasks — E01-US01 Registrasi akun

- [ ] Schema Zod registrasi + aturan password (`src/modules/auth/schema.ts`) + unit test
- [ ] Rate limiter in-memory (`src/lib/rate-limit.ts`) + unit test
- [ ] Transaksi user + account + kategori bawaan (`src/modules/auth/registration.ts`) + unit test
- [ ] Server Action `registerAction` (validasi, rate limit, auto-login, redirect) + unit test
- [ ] Nonaktifkan `/api/auth/sign-up/email` di better-auth
- [ ] Komponen `~/components/auth/*`: form registrasi, password input (ikon mata), checklist syarat, welcome toast
- [ ] Halaman `/register` (redirect bila sudah login) + tautan "Daftar" di `/login`
- [ ] Toast "Selamat datang, <nama>!" di Beranda
- [ ] E2E Playwright + page object `RegisterPage` + helper DB fixture
- [ ] Smoke: registrasi berhasil
- [ ] Verifikasi: lint, typecheck, format, unit test, build, E2E
