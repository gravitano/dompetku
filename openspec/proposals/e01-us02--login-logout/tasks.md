# Tasks — E01-US02 Login & logout

- [ ] Schema Zod login + pesan (`src/modules/auth/schema.ts`) + unit test
- [ ] `sanitizeCallbackUrl` / `buildLoginUrl` (`src/modules/auth/callback-url.ts`) + unit test
- [ ] Lockout per email 5x / 15 menit (`src/modules/auth/login-lockout.ts`) + unit test
- [ ] Hook better-auth `/sign-in/email` (lockout) + kode error `RATE_LIMITED`
- [ ] Server Action `loginAction` & `logoutAction` + unit test
- [ ] Proxy: `callbackUrl` + header path untuk `requireUserOrRedirect`
- [ ] Komponen `~/components/auth/login-form.tsx`, `auth-alert.tsx`
- [ ] Halaman `/login` (banner logout/registered, redirect bila sudah login)
- [ ] Menu akun dropdown (nama, email, Kategori disabled, Keluar) + guard bfcache
- [ ] E2E Playwright + page object `LoginPage` / `AppShell` + smoke login/logout
- [ ] Verifikasi: lint, typecheck, format, unit test, build, E2E (E01-US02, E01-US01, smoke)
