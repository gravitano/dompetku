/**
 * E01-US02 Login & logout — skenario @smoke (testing.md).
 * Skenario lain ada di `test/web/features/e01-us02-login-logout.spec.ts`.
 */
import { expect, TEST_ACCOUNTS, test } from "../fixtures";
import { AppShell } from "../pages/app-shell";

const budi = TEST_ACCOUNTS.budi;
const isSessionCookie = (name: string) => name.endsWith("session_token");

test.describe("@smoke Login & logout", () => {
  test("login berhasil", async ({ page, loginPage }) => {
    await loginPage.goto();
    await loginPage.login(budi.email, budi.password);

    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByTestId("page-title")).toHaveText("Beranda");
    await expect(new AppShell(page).accountMenu).toContainText(budi.name);

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => isSessionCookie(c.name))).toBe(true);
  });

  test("logout", async ({ page, loginAs, loginPage }) => {
    await loginAs("budi");
    await page.goto("/");
    const sessionCookie = (await page.context().cookies()).find((c) =>
      isSessionCookie(c.name),
    );
    expect(sessionCookie).toBeDefined();

    await new AppShell(page).logout();

    await expect(loginPage.title).toHaveText("Masuk");
    await expect(loginPage.alert).toHaveText("Anda telah keluar");
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => isSessionCookie(c.name))).toBe(false);

    // Sesi dicabut di server: cookie lama tidak berlaku lagi.
    await page.context().addCookies([sessionCookie!]);
    await page.goto("/");
    await expect(page).toHaveURL((url) => url.pathname === "/login");
  });
});
