/**
 * E01-US01 Registrasi akun — docs/features/phase-01-mvp/e-01---akun-keamanan/
 * e01-us01--registrasi-akun---testing.md
 *
 * Skenario @smoke "Registrasi berhasil" ada di `test/web/smoke/register.spec.ts`.
 * Butuh DB yang sudah di-seed (`pnpm db:seed`, akun budi@example.com).
 */
import { expect, TEST_ACCOUNTS, test, uniqueEmail } from "../fixtures";

const PASSWORD = "rahasia123";

test.describe("Registrasi akun", () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test.describe("@happy-path", () => {
    test("akun baru memiliki kategori bawaan dan belum punya transaksi", async ({
      page,
      registerPage,
      db,
    }, testInfo) => {
      const email = uniqueEmail("citra", testInfo.project.name);
      await registerPage.register({
        name: "Citra Lestari",
        email,
        password: PASSWORD,
      });
      await expect(page).toHaveURL((url) => url.pathname === "/");

      const summary = await db.getUserSummary(email);
      expect(summary).not.toBeNull();
      expect(summary!.expenseCategories.toSorted()).toEqual(
        [
          "Makan & Minum",
          "Transportasi",
          "Belanja",
          "Tagihan",
          "Hiburan",
          "Kesehatan",
          "Lainnya",
        ].toSorted(),
      );
      expect(summary!.incomeCategories.toSorted()).toEqual(
        ["Gaji", "Bonus", "Hadiah", "Lainnya"].toSorted(),
      );
      expect(summary!.transactionCount).toBe(0);
    });

    test.fixme("kategori bawaan tampil di form Catat Pengeluaran", async () => {}); // diverifikasi lewat DB pada test di atas. // Form "Catat Pengeluaran" dibuat di EPIC-002; data kategori sudah

    test("tautan Masuk ↔ Daftar antara halaman registrasi dan login", async ({
      page,
      registerPage,
      loginPage,
    }) => {
      await registerPage.loginLink.click();
      await expect(page).toHaveURL(/\/login$/);
      await loginPage.registerLink.click();
      await expect(page).toHaveURL(/\/register$/);
      await expect(registerPage.title).toHaveText("Buat Akun");
    });
  });

  test.describe("@ux", () => {
    test("default: fokus di Nama, syarat password tampil abu-abu", async ({
      registerPage,
    }) => {
      await expect(registerPage.nameInput).toBeFocused();
      await expect(registerPage.passwordRule("length")).toHaveText(
        /Minimal 8 karakter/,
      );
      await expect(registerPage.passwordRule("length")).toHaveAttribute(
        "data-state",
        "idle",
      );
      await expect(registerPage.passwordRule("mix")).toHaveAttribute(
        "data-state",
        "idle",
      );
    });

    test("checklist password real-time dan ikon mata", async ({
      registerPage,
    }) => {
      const { passwordInput, passwordToggle } = registerPage;
      await passwordInput.fill("abc");
      await expect(registerPage.passwordRule("length")).toHaveAttribute(
        "data-state",
        "unmet",
      );
      await passwordInput.fill("abc12345");
      await expect(registerPage.passwordRule("length")).toHaveAttribute(
        "data-state",
        "met",
      );
      await expect(registerPage.passwordRule("mix")).toHaveAttribute(
        "data-state",
        "met",
      );

      await expect(passwordInput).toHaveAttribute("type", "password");
      await passwordToggle.click();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await passwordToggle.click();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });

    test("nama dibatasi 50 karakter", async ({ registerPage }) => {
      await registerPage.nameInput.fill("a".repeat(60));
      await expect(registerPage.nameInput).toHaveValue("a".repeat(50));
    });

    test("format email divalidasi saat field ditinggalkan", async ({
      registerPage,
    }) => {
      await registerPage.emailInput.fill("budi@example");
      await registerPage.passwordInput.focus();
      await expect(registerPage.emailError).toHaveText(
        "Format email tidak valid",
      );
    });
  });

  test.describe("@validation", () => {
    for (const password of ["abc12", "abcdefgh", "12345678"]) {
      test(`password "${password}" tidak memenuhi syarat`, async ({
        registerPage,
        db,
      }, testInfo) => {
        const email = uniqueEmail("lemah", testInfo.project.name);
        await registerPage.register({ name: "Budi", email, password });

        await expect(registerPage.passwordError).toHaveText(
          "Password belum memenuhi syarat",
        );
        expect(await db.countUsersByEmail(email)).toBe(0);
      });
    }

    test("konfirmasi password tidak sama", async ({ registerPage }) => {
      await registerPage.register({
        name: "Citra Lestari",
        email: "citra@example.com",
        password: PASSWORD,
        confirmPassword: "rahasia124",
      });

      await expect(registerPage.confirmError).toHaveText(
        "Konfirmasi password tidak sama",
      );
      await expect(registerPage.nameInput).toHaveValue("Citra Lestari");
      await expect(registerPage.emailInput).toHaveValue("citra@example.com");
    });

    const cases = [
      { field: "nama", override: { name: "" }, message: "Nama wajib diisi" },
      { field: "email", override: { email: "" }, message: "Email wajib diisi" },
      {
        field: "email",
        override: { email: "budi@example" },
        message: "Format email tidak valid",
      },
    ] as const;
    for (const { field, override, message } of cases) {
      test(`${field} "${Object.values(override)[0]}" → ${message}`, async ({
        registerPage,
      }) => {
        await registerPage.register({
          name: "Citra Lestari",
          email: "citra@example.com",
          password: PASSWORD,
          ...override,
        });
        const error =
          field === "nama" ? registerPage.nameError : registerPage.emailError;
        await expect(error).toHaveText(message);
      });
    }

    for (const email of ["budi@example.com", "Budi@Example.COM"]) {
      test(`email sudah terdaftar: ${email}`, async ({
        page,
        registerPage,
        db,
      }) => {
        await registerPage.register({
          name: "Budi Lain",
          email,
          password: PASSWORD,
        });

        await expect(registerPage.emailError).toHaveText(
          "Email sudah terdaftar. Silakan masuk.",
        );
        expect(await db.countUsersByEmail(TEST_ACCOUNTS.budi.email)).toBe(1);
        // Data lain tidak hilang.
        await expect(registerPage.nameInput).toHaveValue("Budi Lain");
        await expect(registerPage.passwordInput).toHaveValue(PASSWORD);

        await registerPage.emailLoginLink.click();
        await expect(page).toHaveURL(/\/login$/);
      });
    }
  });

  test.describe("@error-handling", () => {
    test("tombol Daftar ditekan dua kali → hanya satu akun", async ({
      page,
      registerPage,
      db,
    }, testInfo) => {
      const email = uniqueEmail("dimas", testInfo.project.name);
      // Perlambat request agar state loading terlihat.
      await page.route("**/register", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
        await route.continue();
      });

      await registerPage.fill({ name: "Dimas", email, password: PASSWORD });
      await registerPage.submitButton.dblclick();

      await expect(registerPage.submitButton).toBeDisabled();
      await expect(registerPage.submitButton).toHaveText("Mendaftarkan...");
      await expect(registerPage.nameInput).toBeDisabled();

      await expect(page).toHaveURL((url) => url.pathname === "/");
      expect(await db.countUsersByEmail(email)).toBe(1);
    });

    test("gagal mendaftar karena koneksi terputus", async ({
      page,
      registerPage,
      db,
    }, testInfo) => {
      const email = uniqueEmail("offline", testInfo.project.name);
      await page.route("**/register", (route) =>
        route.request().method() === "POST" ? route.abort() : route.continue(),
      );

      await registerPage.register({
        name: "Citra Lestari",
        email,
        password: PASSWORD,
      });

      await expect(registerPage.errorBanner).toHaveText(
        "Gagal mendaftar. Periksa koneksi lalu coba lagi.",
      );
      await expect(registerPage.nameInput).toHaveValue("Citra Lestari");
      await expect(registerPage.emailInput).toHaveValue(email);
      // Password dikosongkan hanya saat kesalahan sistem (AC 6).
      await expect(registerPage.passwordInput).toHaveValue("");
      await expect(registerPage.confirmInput).toHaveValue("");
      expect(await db.countUsersByEmail(email)).toBe(0);

      // Bisa mencoba lagi setelah koneksi pulih.
      await page.unroute("**/register");
      await registerPage.passwordInput.fill(PASSWORD);
      await registerPage.confirmInput.fill(PASSWORD);
      await registerPage.submit();
      await expect(page).toHaveURL((url) => url.pathname === "/");
      expect(await db.countUsersByEmail(email)).toBe(1);
    });
  });

  test.describe("@security", () => {
    test("pengguna yang sudah login diarahkan ke Beranda", async ({
      page,
      loginAs,
    }) => {
      await loginAs("budi");
      await page.goto("/register");
      await expect(page).toHaveURL((url) => url.pathname === "/");
      await expect(page.getByTestId("page-title")).toHaveText("Beranda");
    });

    test("endpoint sign-up better-auth dinonaktifkan", async ({
      request,
      db,
    }, testInfo) => {
      const email = uniqueEmail("api", testInfo.project.name);
      const response = await request.post("/api/auth/sign-up/email", {
        data: { name: "API", email, password: PASSWORD },
      });
      expect(response.status()).toBe(404);
      expect(await db.countUsersByEmail(email)).toBe(0);
    });
  });
});
