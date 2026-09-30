# Tasks — E01-US02 Login & logout

- [x] Schema Zod login + pesan (`src/modules/auth/schema.ts`) + unit test
- [x] `sanitizeCallbackUrl` / `buildLoginUrl` (`src/modules/auth/callback-url.ts`) + unit test
- [x] Lockout per email 5x / 15 menit (`src/modules/auth/login-lockout.ts`) + unit test
- [x] Hook better-auth `/sign-in/email` (lockout) + kode error `RATE_LIMITED`
- [x] Server Action `loginAction` & `logoutAction` + unit test
- [x] Proxy: `callbackUrl` + header path untuk `requireUserOrRedirect`
- [x] Komponen `~/components/auth/login-form.tsx`, `auth-alert.tsx`
- [x] Halaman `/login` (banner logout/registered, redirect bila sudah login)
- [x] Menu akun dropdown (nama, email, Kategori disabled, Keluar) + guard bfcache
- [x] E2E Playwright + page object `LoginPage` / `AppShell` + smoke login/logout
- [x] Verifikasi: lint, typecheck, format, unit test, build, E2E (E01-US02, E01-US01, smoke)
