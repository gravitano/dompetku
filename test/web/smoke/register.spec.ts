/**
 * E01-US01 Registrasi akun — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e01-us01-registrasi-akun.spec.ts`.
 */
import { expect, test, uniqueEmail } from "../fixtures";
import { AppShell } from "../pages/app-shell";

test.describe("@smoke Registrasi akun", () => {
  test("registrasi berhasil lalu otomatis masuk ke Beranda", async ({
    page,
    registerPage,
  }, testInfo) => {
    const email = uniqueEmail("citra", testInfo.project.name);

    await registerPage.goto();
    await registerPage.register({
      name: "Citra Lestari",
      email,
      password: "rahasia123",
    });

    await expect(
      page.getByText("Selamat datang, Citra Lestari!"),
    ).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === "/" && !url.search);
    await expect(page.getByTestId("page-title")).toHaveText("Beranda");
    await expect(new AppShell(page).accountMenuButton).toHaveAccessibleName(
      /Citra Lestari/,
    );
  });
});
