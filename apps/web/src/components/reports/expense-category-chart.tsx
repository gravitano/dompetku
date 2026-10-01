"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent } from "react";
import { Pie, PieChart, Sector, type PieSectorShapeProps } from "recharts";

import { formatRupiah, formatRupiahShort } from "~/lib/format";
import type { ChartSlice } from "~/modules/reports/view";

import { percentLabel } from "./category-breakdown-list";

const SIZE = 224;
const OUTER_RADIUS = 100;
const INNER_RADIUS = 64;
/** Irisan aktif sedikit membesar (highlight UX-02). */
const ACTIVE_GROW = 6;

type ExpenseCategoryChartProps = {
  slices: readonly ChartSlice[];
  /** Total pengeluaran (string digit). */
  total: string;
  monthLabel: string;
};

/**
 * Titik tengah irisan ke-`index` (koordinat chart) — posisi tooltip. Donut
 * mulai dari jam 12 searah jarum jam (`startAngle` 90 → -270).
 */
function sliceAnchor(slices: readonly ChartSlice[], index: number) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const before = slices
    .slice(0, index)
    .reduce((sum, slice) => sum + slice.value, 0);
  const mid = (before + slices[index].value / 2) / total;
  const angle = ((90 - 360 * mid) * Math.PI) / 180;
  const radius = (INNER_RADIUS + OUTER_RADIUS) / 2;
  return {
    x: SIZE / 2 + radius * Math.cos(angle),
    y: SIZE / 2 - radius * Math.sin(angle),
  };
}

function sliceName(slice: ChartSlice): string {
  return slice.categoryCount > 1
    ? `${slice.name} (${slice.categoryCount} kategori)`
    : slice.name;
}

/**
 * Donut porsi pengeluaran per kategori (E04-US02 AC 3, UX-02). Tengah donut =
 * total singkat ("Rp 2 jt"). Hover (mouse) atau tap pertama (sentuh)
 * meng-highlight irisan + tooltip (nama, nominal lengkap, persentase); klik
 * mouse / tap kedua membuka daftar transaksi terfilter (AC 7). Grafik
 * `role="img"` dengan ringkasan teks; angka lengkap selalu ada di daftar
 * (AC 9), sehingga informasi tidak bergantung warna.
 */
export function ExpenseCategoryChart({
  slices,
  total,
  monthLabel,
}: ExpenseCategoryChartProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  /** Jenis pointer terakhir (`mouse` → hover sudah menampilkan tooltip). */
  const pointerType = useRef<string>("mouse");
  const active = activeIndex === null ? null : slices[activeIndex];
  const anchor = activeIndex === null ? null : sliceAnchor(slices, activeIndex);

  const summary = `Grafik donut pengeluaran per kategori ${monthLabel}, total ${formatRupiah(
    BigInt(total),
  )}: ${slices
    .map((slice) => `${sliceName(slice)} ${percentLabel(slice.percentTenths)}`)
    .join(", ")}.`;

  function select(index: number) {
    if (activeIndex === index) {
      router.push(slices[index].href);
    } else {
      setActiveIndex(index);
    }
  }

  function renderSlice(props: PieSectorShapeProps) {
    const { index } = props;
    const slice = slices[index];
    const isActive = index === activeIndex;
    // Titik tengah irisan (koordinat SVG) — target tap/hover yang pasti
    // berada di dalam irisan (dipakai E2E; titik tengah kotak pembatas irisan
    // ≥ 50% bisa jatuh di lubang donut).
    const angle = (-(props.midAngle ?? 0) * Math.PI) / 180;
    const radius = ((props.innerRadius ?? 0) + (props.outerRadius ?? 0)) / 2;
    return (
      <g
        data-testid={`chart-segment-${slice.key}`}
        data-active={isActive}
        data-hit-x={Math.round((props.cx ?? 0) + radius * Math.cos(angle))}
        data-hit-y={Math.round((props.cy ?? 0) + radius * Math.sin(angle))}
        className="cursor-pointer"
        onPointerDown={(event: PointerEvent) => {
          pointerType.current = event.pointerType;
        }}
        onPointerEnter={(event: PointerEvent) => {
          if (event.pointerType === "mouse") setActiveIndex(index);
        }}
        onPointerLeave={(event: PointerEvent) => {
          if (event.pointerType === "mouse") setActiveIndex(null);
        }}
        onClick={() => {
          if (pointerType.current === "mouse") {
            router.push(slice.href);
          } else {
            select(index);
          }
        }}
      >
        <Sector
          cx={props.cx}
          cy={props.cy}
          startAngle={props.startAngle}
          endAngle={props.endAngle}
          innerRadius={props.innerRadius}
          outerRadius={
            isActive
              ? (props.outerRadius ?? 0) + ACTIVE_GROW
              : props.outerRadius
          }
          fill={slice.color}
          stroke="var(--card)"
          strokeWidth={2}
          opacity={activeIndex === null || isActive ? 1 : 0.55}
        />
      </g>
    );
  }

  return (
    <div
      data-testid="expense-category-chart"
      className="relative mx-auto shrink-0"
      style={{ width: SIZE, height: SIZE }}
    >
      <div role="img" aria-label={summary}>
        <PieChart
          width={SIZE}
          height={SIZE}
          accessibilityLayer={false}
          // Ringkasan dibacakan lewat wrapper `role="img"`; SVG dekoratif.
          role="presentation"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Pie
            data={slices.map((slice) => ({
              key: slice.key,
              value: slice.value,
            }))}
            dataKey="value"
            nameKey="key"
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={INNER_RADIUS}
            outerRadius={OUTER_RADIUS}
            paddingAngle={0}
            // Tanpa animasi: irisan langsung di posisi akhir (bisa langsung
            // di-tap/hover, tanpa gerakan yang mengganggu).
            isAnimationActive={false}
            shape={renderSlice}
          />
        </PieChart>
      </div>

      {/* Total singkat di tengah donut (nominal lengkap ada di atas grafik). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
      >
        <span className="text-xs text-muted-foreground">Total</span>
        <span
          data-testid="chart-center-total"
          className="text-lg font-semibold tabular-nums"
        >
          {formatRupiahShort(BigInt(total))}
        </span>
      </div>

      {active && anchor ? (
        <div
          role="status"
          data-testid="chart-tooltip"
          data-category={active.key}
          className="pointer-events-none absolute z-10 w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
          style={{ left: anchor.x, top: anchor.y }}
        >
          <p className="flex items-center gap-2 font-medium">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: active.color }}
            />
            <span data-testid="chart-tooltip-name">{sliceName(active)}</span>
          </p>
          <p className="mt-0.5 flex justify-between gap-4 tabular-nums">
            <span data-testid="chart-tooltip-amount" className="font-semibold">
              {formatRupiah(BigInt(active.amount))}
            </span>
            <span
              data-testid="chart-tooltip-percent"
              className="text-muted-foreground"
            >
              {percentLabel(active.percentTenths)}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
