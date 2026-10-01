import { expect, type Locator, type Page } from "@playwright/test";

/** Satu baris daftar kategori: nama, label arsip, persentase, nominal. */
export type BreakdownRow = {
  name: string;
  percent: string;
  amount: string;
};

/**
 * Page Object tab Laporan — grafik pengeluaran per kategori (E04-US02).
 * Selector mengikuti testing.md; semua locator dibatasi ke root halaman
 * (`reports-page`) agar tidak bentrok dengan selector halaman lain.
 */
export class ReportsPage {
  readonly root: Locator;
  readonly title: Locator;
  readonly monthLabel: Locator;
  readonly monthPrev: Locator;
  readonly monthNext: Locator;
  readonly total: Locator;
  readonly chart: Locator;
  readonly chartCenter: Locator;
  readonly tooltip: Locator;
  readonly items: Locator;
  readonly empty: Locator;
  readonly loadError: Locator;
  readonly retryButton: Locator;
  readonly skeleton: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId("reports-page");
    this.title = this.root.getByTestId("page-title");
    this.monthLabel = this.root.getByTestId("report-month-label");
    this.monthPrev = this.root.getByTestId("report-month-prev");
    this.monthNext = this.root.getByTestId("report-month-next");
    this.total = this.root.getByTestId("report-total-expense");
    this.chart = this.root.getByTestId("expense-category-chart");
    this.chartCenter = this.root.getByTestId("chart-center-total");
    this.tooltip = this.root.getByTestId("chart-tooltip");
    this.items = this.root.getByTestId("category-breakdown-item");
    this.empty = this.root.getByTestId("report-empty-state");
    this.loadError = this.root.getByTestId("report-load-error");
    this.retryButton = this.root.getByTestId("report-retry-button");
    this.skeleton = this.root.getByTestId("report-skeleton");
  }

  /** Buka tab Laporan (bulan berjalan, atau `month` "YYYY-MM" lewat URL). */
  async goto(month?: string) {
    await this.page.goto(month ? `/reports?month=${month}` : "/reports");
    await this.root.waitFor();
  }

  item(key: string): Locator {
    return this.root.locator(
      `[data-testid="category-breakdown-item"][data-category="${key}"]`,
    );
  }

  segment(key: string): Locator {
    return this.root.getByTestId(`chart-segment-${key}`);
  }

  /**
   * Titik tengah irisan dalam koordinat viewport (`data-hit-*` = koordinat
   * SVG), agar tap/hover selalu mengenai irisan — titik tengah kotak pembatas
   * irisan besar bisa jatuh di lubang donut. Menunggu animasi donut selesai
   * (titik tidak berubah lagi).
   */
  async segmentPoint(key: string): Promise<{ x: number; y: number }> {
    const segment = this.segment(key);
    await this.chart.scrollIntoViewIfNeeded();
    const hit = async () =>
      `${await segment.getAttribute("data-hit-x")},${await segment.getAttribute("data-hit-y")}`;
    let previous = "";
    await expect
      .poll(
        async () => {
          const current = await hit();
          const stable = current === previous;
          previous = current;
          return stable;
        },
        { intervals: [100] },
      )
      .toBe(true);
    const svg = await this.chart.locator("svg").first().boundingBox();
    if (!svg) throw new Error(`Grafik tidak terlihat`);
    const [x, y] = previous.split(",").map(Number);
    return { x: svg.x + x, y: svg.y + y };
  }

  /** Tap (HP) atau hover (desktop) irisan donut: highlight + tooltip. */
  async focusSegment(key: string, isMobile: boolean) {
    const { x, y } = await this.segmentPoint(key);
    // Diulang bila tap/hover terjadi sebelum hidrasi (event belum terpasang).
    await expect(async () => {
      if (isMobile) await this.page.touchscreen.tap(x, y);
      else {
        await this.page.mouse.move(0, 0);
        await this.page.mouse.move(x, y);
      }
      await expect(this.segment(key)).toHaveAttribute("data-active", "true", {
        timeout: 1000,
      });
    }).toPass();
  }

  /** Tap kedua (HP) atau klik (desktop) irisan: buka daftar terfilter. */
  async openSegment(key: string, isMobile: boolean) {
    const { x, y } = await this.segmentPoint(key);
    if (isMobile) await this.page.touchscreen.tap(x, y);
    else await this.page.mouse.click(x, y);
  }

  /** Isi daftar kategori berurutan (teks yang tampil). */
  async rows(): Promise<BreakdownRow[]> {
    const count = await this.items.count();
    const rows: BreakdownRow[] = [];
    for (let i = 0; i < count; i++) {
      const item = this.items.nth(i);
      rows.push({
        name: await item.getByTestId("category-breakdown-name").innerText(),
        percent: await item
          .getByTestId("category-breakdown-percent")
          .innerText(),
        amount: await item.getByTestId("category-breakdown-amount").innerText(),
      });
    }
    return rows;
  }
}
