/**
 * Kotak info "Akun demo" di halaman login — tampil bila server dijalankan
 * dengan `DEMO_MODE=true` (di-set di `webServer.env` playwright.config.ts).
 * Butuh DB yang sudah di-seed (`pnpm db:seed`: budi@example.com).
 */
import { expect, TEST_ACCOUNTS, test } from "../fixtures";

const budi = TEST_ACCOUNTS.budi;

test.describe("Akun demo di halaman login", () => {
  test("kotak akun demo tampil dengan kredensial budi", async ({
    loginPage,
  }) => {
    await loginPage.goto();

    await expect(loginPage.demoInfo).toBeVisible();
    await expect(loginPage.demoInfo).toContainText("Akun demo");
    await expect(loginPage.demoInfo).toContainText(budi.email);
    await expect(loginPage.demoInfo).toContainText(budi.password);
    await expect(loginPage.demoFillButton).toHaveText("Pakai akun demo");
  });

  test("tombol mengisi form tanpa submit, lalu Masuk ke Beranda", async ({
    page,
    loginPage,
  }) => {
    await loginPage.goto();
    await expect(loginPage.emailInput).toHaveValue("");
    await expect(loginPage.passwordInput).toHaveValue("");

    await loginPage.demoFillButton.click();

    await expect(loginPage.emailInput).toHaveValue(budi.email);
    await expect(loginPage.passwordInput).toHaveValue(budi.password);
    // Tidak auto-submit: masih di halaman login.
    await expect(page).toHaveURL((url) => url.pathname === "/login");

    await loginPage.submit();
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByTestId("page-title")).toHaveText("Beranda");
  });
});
