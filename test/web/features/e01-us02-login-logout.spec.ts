/**
 * E01-US02 Login & logout — docs/features/phase-01-mvp/e-01---akun-keamanan/
 * e01-us02--login-logout---testing.md
 *
 * Skenario @smoke "Login berhasil" & "Logout" ada di `test/web/smoke/login.spec.ts`.
 * Butuh DB yang sudah di-seed (`pnpm db:seed`: budi@, lock@example.com).
 * Kedaluwarsa sesi 7 hari diverifikasi lewat unit test (`src/lib/auth.test.ts`).
 */
import { expect, TEST_ACCOUNTS, test, uniqueEmail } from "../fixtures";
import { AppShell } from "../pages/app-shell";

const budi = TEST_ACCOUNTS.budi;
const lock = TEST_ACCOUNTS.lock;
const MESSAGES = {
  invalid: "Email atau password salah",
  locked: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
  system: "Gagal masuk. Periksa koneksi lalu coba lagi.",
  loggedOut: "Anda telah keluar",
  registered: "Akun berhasil dibuat. Silakan masuk.",
};

const isPath = (path: string) => (url: URL) => url.pathname === path;
/** Request POST Server Action ke halaman /login. */
const isLoginPost = (url: URL) => url.pathname === "/login";

test.describe("Login & logout", () => {
  test.describe("@happy-path", () => {
    test("email tidak membedakan huruf besar dan kecil", async ({
      page,
      loginPage,
    }) => {
      await loginPage.goto();
      await loginPage.login("Budi@Example.COM", budi.password);
      await expect(page).toHaveURL(isPath("/"));
      await expect(page.getByTestId("page-title")).toHaveText("Beranda");
    });

    test("kembali ke halaman tujuan setelah login", async ({
      page,
      loginPage,
    }) => {
      await page.goto("/budgets");
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/login" &&
          url.searchParams.get("callbackUrl") === "/budgets",
      );

      await loginPage.login(budi.email, budi.password);
      await expect(page).toHaveURL(isPath("/budgets"));
      await expect(page.getByTestId("page-title")).toHaveText("Anggaran");
    });

    test("sesi tetap aktif setelah browser ditutup", async ({
      page,
      browser,
      loginPage,
    }) => {
      await loginPage.goto();
      await loginPage.login(budi.email, budi.password);
      await expect(page).toHaveURL(isPath("/"));

      // Cookie persisten (bukan session cookie) dengan umur ~7 hari.
      const cookie = (await page.context().cookies()).find((c) =>
        c.name.endsWith("session_token"),
      );
      const sevenDays = 7 * 24 * 60 * 60;
      const now = Date.now() / 1000;
      expect(cookie?.expires).toBeGreaterThan(now + sevenDays - 60);
      expect(cookie?.expires).toBeLessThanOrEqual(now + sevenDays + 60);

      // "Tutup lalu buka browser": context baru dari storageState.
      const state = await page.context().storageState();
      await page.context().close();
      const context = await browser.newContext({ storageState: state });
      const reopened = await context.newPage();
      await reopened.goto("/");
      await expect(reopened).toHaveURL(isPath("/"));
      await expect(reopened.getByTestId("page-title")).toHaveText("Beranda");
      await context.close();
    });

    test("tautan Daftar ke halaman registrasi", async ({ page, loginPage }) => {
      await loginPage.goto();
      await loginPage.registerLink.click();
      await expect(page).toHaveURL(isPath("/register"));
    });

    test("banner setelah registrasi tanpa auto-login", async ({
      loginPage,
    }) => {
      await loginPage.goto("?registered=1");
      await expect(loginPage.alert).toHaveText(MESSAGES.registered);
    });
  });

  test.describe("@ux", () => {
    test("default: fokus di Email, tanpa banner, ikon mata password", async ({
      loginPage,
    }) => {
      await loginPage.goto();
      await expect(loginPage.title).toHaveText("Masuk");
      await expect(
        loginPage.page.getByText("Selamat datang kembali."),
      ).toBeVisible();
      await expect(loginPage.emailInput).toBeFocused();
      await expect(loginPage.emailInput).toHaveAttribute("type", "email");
      await expect(loginPage.alert).toHaveCount(0);

      await loginPage.passwordInput.fill("rahasia123");
      await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
      await loginPage.passwordToggle.click();
      await expect(loginPage.passwordInput).toHaveAttribute("type", "text");
      await loginPage.passwordToggle.click();
      await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
    });

    test("menu akun menampilkan nama, email, dan Keluar", async ({
      page,
      loginAs,
    }) => {
      await loginAs("budi");
      await page.goto("/");
      const shell = new AppShell(page);
      await expect(shell.accountMenu).toContainText(budi.name);
      await expect(shell.accountMenu).toContainText("BS");

      await shell.openAccountMenu();
      await expect(shell.accountMenuUserName).toHaveText(budi.name);
      await expect(shell.accountMenuEmail).toHaveText(budi.email);
      await expect(shell.accountMenuCategories).toHaveAttribute(
        "data-disabled",
        "",
      );
      await expect(shell.logoutItem).toHaveText("Keluar");

      // Tap di luar dropdown menutupnya.
      await page.mouse.click(10, 400);
      await expect(shell.accountMenuContent).toBeHidden();
    });
  });

  test.describe("@validation", () => {
    // Email tidak terdaftar dibuat unik per run: kegagalan dihitung per email
    // (lockout 5x / 15 menit) dan tidak pernah di-reset oleh login berhasil.
    for (const { label, email: fixedEmail, password } of [
      { label: budi.email, email: budi.email, password: "salahpass123" },
      { label: "tidakada@example.com", email: null, password: "rahasia123" },
    ]) {
      test(`kredensial salah (${label}) menampilkan pesan umum`, async ({
        page,
        loginPage,
      }, testInfo) => {
        const email =
          fixedEmail ?? uniqueEmail("tidakada", testInfo.project.name);
        await loginPage.goto();
        await loginPage.login(email, password);

        await expect(loginPage.alert).toHaveText(MESSAGES.invalid);
        await expect(loginPage.emailInput).toHaveValue(email);
        await expect(loginPage.passwordInput).toHaveValue("");
        await expect(page).toHaveURL(isPath("/login"));
      });
    }

    test("field wajib diisi", async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.submit();
      await expect(loginPage.emailError).toHaveText("Email wajib diisi");
      await expect(loginPage.passwordError).toHaveText("Password wajib diisi");
    });

    test("format email tidak valid", async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.login("budi@example", "rahasia123");
      await expect(loginPage.emailError).toHaveText("Format email tidak valid");
    });
  });

  test.describe("@security", () => {
    test("terlalu banyak percobaan login gagal (lock@example.com)", async ({
      page,
      loginPage,
    }) => {
      await loginPage.goto();
      // 5x gagal. Saat test diulang dalam 15 menit akun mungkin sudah
      // terkunci, jadi kedua pesan diterima di tahap ini.
      for (let i = 0; i < 5; i++) {
        await loginPage.loginExpectingFailure(lock.email, `salah${i}pass`);
        await expect(loginPage.alert).toHaveText(
          new RegExp(`^(${MESSAGES.invalid}|${MESSAGES.locked})$`),
        );
      }

      await loginPage.loginExpectingFailure(lock.email, lock.password);
      await expect(loginPage.alert).toHaveText(MESSAGES.locked);
      await expect(page).toHaveURL(isPath("/login"));
      await expect(loginPage.passwordInput).toHaveValue("");

      // Endpoint HTTP better-auth juga terkunci untuk email ini.
      const response = await page.request.post("/api/auth/sign-in/email", {
        data: { email: lock.email, password: lock.password },
      });
      expect(response.status()).toBe(429);
    });

    test("penguncian dihitung per email: tepat setelah 5x gagal", async ({
      loginPage,
    }, testInfo) => {
      const email = uniqueEmail("coba", testInfo.project.name);
      await loginPage.goto();
      for (let i = 0; i < 5; i++) {
        await loginPage.loginExpectingFailure(email, "rahasia123");
        await expect(loginPage.alert).toHaveText(MESSAGES.invalid);
      }
      await loginPage.loginExpectingFailure(email, "rahasia123");
      await expect(loginPage.alert).toHaveText(MESSAGES.locked);
    });

    test("halaman terproteksi tidak dapat diakses tanpa login", async ({
      page,
    }) => {
      await page.goto("/transactions");
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === "/login" &&
          url.searchParams.get("callbackUrl") === "/transactions",
      );
      await expect(page.getByTestId("page-title")).toHaveCount(0);
    });

    test("tombol back setelah logout tidak menampilkan data", async ({
      page,
      loginAs,
      loginPage,
    }) => {
      await loginAs("budi");
      await page.goto("/transactions");
      await expect(page.getByTestId("page-title")).toHaveText("Transaksi");

      await new AppShell(page).logout();
      await expect(loginPage.alert).toHaveText(MESSAGES.loggedOut);

      await page.goBack();
      await expect(page).toHaveURL(isPath("/login"));
      await expect(loginPage.title).toHaveText("Masuk");
      await expect(page.getByTestId("app-main")).toHaveCount(0);
      await expect(page.getByTestId("page-title")).toHaveCount(0);
    });

    test("pengguna yang sudah login tidak melihat halaman login", async ({
      page,
      loginAs,
    }) => {
      await loginAs("budi");
      await page.goto("/login");
      await expect(page).toHaveURL(isPath("/"));
      await expect(page.getByTestId("page-title")).toHaveText("Beranda");

      await page.goto("/login?callbackUrl=%2Freports");
      await expect(page).toHaveURL(isPath("/reports"));
    });

    test("callbackUrl eksternal diabaikan (open redirect)", async ({
      page,
      loginPage,
      baseURL,
    }) => {
      await loginPage.goto("?callbackUrl=https%3A%2F%2Fevil.example.com");
      await loginPage.login(budi.email, budi.password);
      await expect(page).toHaveURL(`${baseURL}/`);

      await page.goto("/login?callbackUrl=%2F%2Fevil.example.com");
      await expect(page).toHaveURL(`${baseURL}/`);
    });

    test("callbackUrl dot-segment yang menjadi //host diabaikan", async ({
      page,
      loginPage,
      baseURL,
    }) => {
      // `/.//evil.example.com` dinormalisasi URL parser menjadi `//evil…`.
      await loginPage.goto("?callbackUrl=%2F.%2F%2Fevil.example.com");
      await loginPage.login(budi.email, budi.password);
      await expect(page).toHaveURL(`${baseURL}/`);

      // User yang sudah login membuka /login dengan payload serupa.
      for (const payload of [
        "%2F%252e%2F%2Fevil.example.com",
        "%2Fa%2F..%2F%2Fevil.example.com",
      ]) {
        await page.goto(`/login?callbackUrl=${payload}`);
        await expect(page).toHaveURL(`${baseURL}/`);
      }
    });
  });

  test.describe("@error-handling", () => {
    test("gagal login karena koneksi terputus", async ({ page, loginPage }) => {
      await loginPage.goto();
      await page.route(isLoginPost, (route) =>
        route.request().method() === "POST" ? route.abort() : route.continue(),
      );

      await loginPage.login(budi.email, budi.password);
      await expect(loginPage.alert).toHaveText(MESSAGES.system);
      await expect(loginPage.emailInput).toHaveValue(budi.email);
      await expect(loginPage.passwordInput).toHaveValue("");
      await expect(loginPage.submitButton).toBeEnabled();

      // Bisa mencoba lagi setelah koneksi pulih.
      await page.unroute(isLoginPost);
      await loginPage.passwordInput.fill(budi.password);
      await loginPage.submit();
      await expect(page).toHaveURL(isPath("/"));
    });

    test("tombol Masuk tidak bisa ditekan dua kali", async ({
      page,
      loginPage,
    }) => {
      await loginPage.goto();
      let posts = 0;
      await page.route(isLoginPost, async (route) => {
        if (route.request().method() === "POST") {
          posts += 1;
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
        await route.continue();
      });

      await loginPage.fill(budi.email, budi.password);
      await loginPage.submitButton.dblclick();
      await expect(loginPage.submitButton).toBeDisabled();
      await expect(loginPage.submitButton).toHaveText("Masuk...");
      await expect(loginPage.emailInput).toBeDisabled();

      await expect(page).toHaveURL(isPath("/"));
      expect(posts).toBe(1);
    });
  });
});
