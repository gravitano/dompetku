/**
 * Utilitas tanggal DompetKu.
 *
 * Aturan (ITA §4.1): tanggal transaksi disimpan sebagai DATE, periode bulan
 * dihitung dengan zona Asia/Jakarta. Nilai "tanggal" di sini direpresentasikan
 * sebagai Date pada 00:00 UTC (cocok untuk kolom Prisma `@db.Date`).
 */
export const APP_TIME_ZONE = "Asia/Jakarta";
export const APP_LOCALE = "id-ID";

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
] as const;

const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" untuk instant `now` menurut kalender Asia/Jakarta. */
export function toJakartaDateString(now: Date = new Date()): string {
  return ymdFormatter.format(now);
}

/** Parse "YYYY-MM-DD" → Date 00:00 UTC. */
export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Format tanggal tidak valid: ${value}`);
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCDate() !== Number(d)) {
    throw new Error(`Tanggal tidak valid: ${value}`);
  }
  return date;
}

/** Date-only → "YYYY-MM-DD". */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Tanggal hari ini (Asia/Jakarta) sebagai Date 00:00 UTC. */
export function today(now: Date = new Date()): Date {
  return parseDateOnly(toJakartaDateString(now));
}

/** Tanggal 1 pada bulan dari `date` (date-only). */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Tanggal terakhir pada bulan dari `date` (date-only). */
export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

/** Geser bulan: addMonths(2026-01-31, 1) → 2026-02-01 (awal bulan). */
export function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

/** Awal bulan berjalan (Asia/Jakarta). */
export function currentMonthStart(now: Date = new Date()): Date {
  return startOfMonth(today(now));
}

const monthYearFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** Date-only → "30 Sep 2026". */
export function formatDate(date: Date): string {
  return `${date.getUTCDate()} ${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Date-only → "Okt" (nama bulan singkat, mis. sumbu grafik tren). */
export function formatMonthShort(date: Date): string {
  return SHORT_MONTHS[date.getUTCMonth()];
}

/** Date-only → "September 2026". */
export function formatMonthYear(date: Date): string {
  return monthYearFormatter.format(date);
}

const WEEKDAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/** Date-only → "Rabu, 30 Sep 2026" (header grup tanggal daftar transaksi). */
export function formatDayLabel(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]}, ${formatDate(date)}`;
}

/** Date-only → "YYYY-MM" (kunci bulan di URL daftar transaksi). */
export function formatMonthKey(date: Date): string {
  return formatDateOnly(date).slice(0, 7);
}

/** "YYYY-MM" → tanggal 1 bulan tsb (date-only). Format salah → error. */
export function parseMonthKey(value: string): Date {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error(`Format bulan tidak valid: ${value}`);
  }
  return parseDateOnly(`${value}-01`);
}

/** "YYYY-MM" bulan berjalan (Asia/Jakarta). */
export function currentMonthKey(now: Date = new Date()): string {
  return toJakartaDateString(now).slice(0, 7);
}

/** Geser "YYYY-MM" sebanyak `months` bulan. */
export function shiftMonthKey(value: string, months: number): string {
  return formatMonthKey(addMonths(parseMonthKey(value), months));
}
