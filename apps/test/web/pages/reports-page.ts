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

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** "YYYY-MM" → nama bulan singkat sumbu X ("Okt"). */
export function shortMonthLabel(month: string): string {
  return SHORT_MONTHS[Number(month.slice(5, 7)) - 1];
}

/**
 * Page Object seksi "Tren 6 bulan" di tab Laporan (E04-US03). Semua locator
 * dibatasi ke root seksi (`reports-trend`) — tidak bentrok dengan grafik
 * kategori (E04-US02) di atasnya.
 */
export class ReportsTrend {
  readonly root: Locator;
  readonly title: Locator;
  readonly legend: Locator;
  readonly chart: Locator;
  readonly bars: Locator;
  readonly xAxisLabels: Locator;
  readonly tooltip: Locator;
  readonly tooltipMonth: Locator;
  readonly tooltipIncome: Locator;
  readonly tooltipExpense: Locator;
  readonly average: Locator;
  readonly averageNote: Locator;
  readonly insufficientData: Locator;
  readonly tableToggle: Locator;
  readonly tableRows: Locator;
  readonly skeleton: Locator;
  readonly loadError: Locator;
  readonly retryButton: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId("reports-trend");
    this.title = this.root.getByRole("heading", { level: 2 });
    this.legend = this.root.getByTestId("trend-legend");
    this.chart = this.root.getByTestId("trend-chart");
    this.bars = this.chart.locator('[data-testid^="trend-bar-"]');
    this.xAxisLabels = this.chart.locator(
      ".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value",
    );
    this.tooltip = this.root.getByTestId("trend-tooltip");
    this.tooltipMonth = this.tooltip.getByTestId("trend-tooltip-month");
    this.tooltipIncome = this.tooltip.getByTestId("trend-tooltip-income");
    this.tooltipExpense = this.tooltip.getByTestId("trend-tooltip-expense");
    this.average = this.root.getByTestId("trend-average-expense");
    this.averageNote = this.root.getByTestId("trend-average-note");
    this.insufficientData = this.root.getByTestId("trend-insufficient-data");
    this.tableToggle = this.root.getByText("Lihat angka per bulan");
    this.tableRows = this.root.getByTestId("trend-table-row");
    this.skeleton = this.root.getByTestId("trend-skeleton");
    this.loadError = this.root.getByTestId("trend-load-error");
    this.retryButton = this.root.getByTestId("trend-retry-button");
  }

  bar(month: string): Locator {
    return this.chart.getByTestId(`trend-bar-${month}`);
  }

  /**
   * Kunci bulan ("YYYY-MM") semua batang, urut sumbu X. Menunggu 6 batang
   * (grafik responsif baru digambar setelah lebar container terukur).
   */
  async barMonths(): Promise<string[]> {
    await expect(this.bars).toHaveCount(6);
    const ids = await this.bars.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid") ?? ""),
    );
    return ids.map((id) => id.replace("trend-bar-", ""));
  }

  /**
   * Tap (HP) atau hover (desktop) batang bulan `month` → highlight + tooltip.
   * Diulang bila tap/hover terjadi sebelum hidrasi (event belum terpasang).
   */
  async focusMonth(month: string, isMobile: boolean) {
    const bar = this.bar(month);
    await this.chart.scrollIntoViewIfNeeded();
    await expect(async () => {
      const box = await bar.boundingBox();
      if (!box) throw new Error(`Batang ${month} tidak terlihat`);
      const x = box.x + box.width / 2;
      const y = box.y + box.height * 0.75;
      if (isMobile) {
        if ((await bar.getAttribute("data-active")) !== "true") {
          await this.page.touchscreen.tap(x, y);
        }
      } else {
        await this.page.mouse.move(0, 0);
        await this.page.mouse.move(x, y);
      }
      await expect(bar).toHaveAttribute("data-active", "true", {
        timeout: 1000,
      });
    }).toPass();
  }
}
