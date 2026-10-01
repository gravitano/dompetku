"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  usePlotArea,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";

import { formatRupiah, formatRupiahShort } from "~/lib/format";
import { TREND_MESSAGES as M, type TrendMonth } from "~/modules/reports/trend";

/** Tinggi grafik (design: ±220px di HP). */
const HEIGHT = 220;
const Y_AXIS_WIDTH = 64;
/** Lebar tooltip (px) — untuk menjaga tooltip tetap di dalam grafik. */
const TOOLTIP_WIDTH = 232;
/** Batang bulan lain meredup saat satu bulan aktif (highlight UX-02). */
const DIMMED_OPACITY = 0.4;

type Anchor = { center: number; top: number; chartWidth: number };

type TrendChartProps = {
  months: readonly TrendMonth[];
};

/** Semua nol → batas atas tetap agar sumbu Y punya skala (Rp 0 … Rp 100 rb). */
const EMPTY_DOMAIN_MAX = 100_000;

/** Ringkasan seluruh angka untuk `role="img"` (screen reader). */
function chartSummary(months: readonly TrendMonth[]): string {
  return `Grafik batang ${M.income.toLowerCase()} dan ${M.expense.toLowerCase()} 6 bulan terakhir: ${months
    .map(
      (month) =>
        `${month.label} ${M.income.toLowerCase()} ${formatRupiah(BigInt(month.income))}, ${M.expense.toLowerCase()} ${formatRupiah(BigInt(month.expense))}`,
    )
    .join("; ")}.`;
}

type HitAreasProps = {
  months: readonly TrendMonth[];
  activeIndex: number | null;
  onPointerDown: (event: ReactPointerEvent) => void;
  onEnter: (index: number, anchor: Anchor) => void;
  onLeave: () => void;
  onTap: (index: number, anchor: Anchor) => void;
};

/**
 * Area tap/hover per bulan (UX-02) = seluruh pita bulan (pasangan batang
 * pemasukan & pengeluaran) di area plot, digambar di dalam SVG chart.
 */
function MonthHitAreas({
  months,
  activeIndex,
  onPointerDown,
  onEnter,
  onLeave,
  onTap,
}: HitAreasProps) {
  const plot = usePlotArea();
  if (!plot || months.length === 0) return null;
  const band = plot.width / months.length;
  const chartWidth = plot.x + plot.width + 8;

  return (
    <g>
      {months.map((month, index) => {
        const x = plot.x + index * band;
        const anchor = { center: x + band / 2, top: plot.y, chartWidth };
        const isActive = index === activeIndex;
        return (
          <rect
            key={month.month}
            data-testid={`trend-bar-${month.month}`}
            data-active={isActive}
            data-income={month.income}
            data-expense={month.expense}
            x={x}
            y={plot.y}
            width={band}
            height={plot.height}
            rx={6}
            fill="var(--foreground)"
            fillOpacity={isActive ? 0.06 : 0}
            className="cursor-pointer"
            onPointerDown={onPointerDown}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") onEnter(index, anchor);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") onLeave();
            }}
            onClick={() => onTap(index, anchor)}
          />
        );
      })}
    </g>
  );
}

/**
 * Grafik batang berpasangan pemasukan (hijau) vs pengeluaran (merah) per bulan
 * (E04-US03 AC 1–4). Sumbu X nama bulan singkat, sumbu Y nominal singkat.
 * Mouse: hover = highlight + tooltip, keluar = tutup. Sentuh: tap = highlight
 * + tooltip; tap bulan yang sama atau di luar grafik = tutup (UX-02/03).
 * Grafik `role="img"` + ringkasan teks; angka lengkap juga ada di tabel.
 */
export function TrendChart({ months }: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerType = useRef<string>("mouse");
  const [active, setActive] = useState<{
    index: number;
    anchor: Anchor;
  } | null>(null);
  const activeIndex = active?.index ?? null;
  const activeMonth = active ? months[active.index] : null;

  // Sentuh: tap di luar grafik menutup tooltip (UX-03).
  useEffect(() => {
    if (activeIndex === null) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setActive(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeIndex]);

  const data = months.map((month) => ({
    month: month.month,
    shortLabel: month.shortLabel,
    income: Number(month.income),
    expense: Number(month.expense),
  }));

  const allZero = data.every(
    (entry) => entry.income === 0 && entry.expense === 0,
  );

  function opacity(index: number) {
    return activeIndex === null || activeIndex === index ? 1 : DIMMED_OPACITY;
  }

  function renderBar(props: BarShapeProps) {
    return <Rectangle {...props} fillOpacity={opacity(props.index)} />;
  }

  const tooltipLeft = active
    ? Math.max(
        0,
        Math.min(
          active.anchor.center - TOOLTIP_WIDTH / 2,
          active.anchor.chartWidth - TOOLTIP_WIDTH,
        ),
      )
    : 0;

  return (
    <div
      ref={containerRef}
      data-testid="trend-chart"
      className="relative w-full"
      style={{ height: HEIGHT }}
    >
      <div role="img" aria-label={chartSummary(months)} className="size-full">
        <BarChart
          responsive
          style={{ width: "100%", height: HEIGHT }}
          data={data}
          accessibilityLayer={false}
          // Ringkasan dibacakan lewat wrapper `role="img"`; SVG dekoratif.
          role="presentation"
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          barCategoryGap="22%"
          barGap={2}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="shortLabel"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            interval={0}
          />
          <YAxis
            width={Y_AXIS_WIDTH}
            // "auto" = batas atas dibulatkan ke tick rapi (Rp 0, 3, 6, 9 jt).
            domain={[0, allZero ? EMPTY_DOMAIN_MAX : "auto"]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickCount={4}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatRupiahShort(value)}
          />
          {/* Tanpa animasi: batang langsung di posisi akhir (deterministik). */}
          <Bar
            dataKey="income"
            name={M.income}
            fill="var(--income)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            shape={renderBar}
          />
          <Bar
            dataKey="expense"
            name={M.expense}
            fill="var(--expense)"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            shape={renderBar}
          />
          <MonthHitAreas
            months={months}
            activeIndex={activeIndex}
            onPointerDown={(event) => {
              pointerType.current = event.pointerType;
            }}
            onEnter={(index, anchor) => setActive({ index, anchor })}
            onLeave={() => setActive(null)}
            onTap={(index, anchor) => {
              // Mouse: hover sudah menampilkan tooltip; klik tidak menutupnya.
              if (pointerType.current === "mouse") {
                setActive({ index, anchor });
              } else {
                setActive((current) =>
                  current?.index === index ? null : { index, anchor },
                );
              }
            }}
          />
        </BarChart>
      </div>

      {active && activeMonth ? (
        <div
          role="status"
          data-testid="trend-tooltip"
          data-month={activeMonth.month}
          className="pointer-events-none absolute z-10 rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
          style={{
            left: tooltipLeft,
            top: active.anchor.top,
            width: TOOLTIP_WIDTH,
          }}
        >
          <p data-testid="trend-tooltip-month" className="font-medium">
            {activeMonth.label}
          </p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-sm bg-income"
              />
              {M.income}
            </dt>
            <dd
              data-testid="trend-tooltip-income"
              className="text-right font-semibold"
            >
              {formatRupiah(BigInt(activeMonth.income))}
            </dd>
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-sm bg-expense"
              />
              {M.expense}
            </dt>
            <dd
              data-testid="trend-tooltip-expense"
              className="text-right font-semibold"
            >
              {formatRupiah(BigInt(activeMonth.expense))}
            </dd>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
