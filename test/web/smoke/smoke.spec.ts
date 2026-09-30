import { expect, test } from "../fixtures";
import { AppShell } from "../pages/app-shell";

test.describe("@smoke", () => {
  test("/api/health mengembalikan status ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      database: "ok",
    });
  });

  test("halaman /login tampil", async ({ page, loginPage }) => {
    await loginPage.goto();
    await expect(page).toHaveTitle(/DompetKu/);
    await expect(loginPage.title).toHaveText("Masuk");
  });

  test("tanpa session, / diarahkan ke /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("user demo bisa masuk ke app shell", async ({
    page,
    loginAs,
  }, testInfo) => {
    await loginAs("budi");
    await page.goto("/");
    const shell = new AppShell(page);
    await expect(shell.header).toBeVisible();
    await expect(page.getByTestId("page-title")).toHaveText("Beranda");

    const nav =
      testInfo.project.name === "mobile"
        ? shell.bottomNav.bind(shell)
        : shell.sidebarNav.bind(shell);
    await nav("transactions").click();
    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByTestId("page-title")).toHaveText("Transaksi");
  });
});
