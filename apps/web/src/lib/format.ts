/**
 * Format nominal Rupiah penuh (tanpa desimal) → "Rp 25.000".
 * Nilai negatif → "-Rp 25.000".
 */
export function formatRupiah(value: bigint | number): string {
  const amount = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  const negative = amount < BigInt(0);
  const abs = negative ? -amount : amount;
  const digits = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}Rp ${digits}`;
}

/**
 * Inisial nama untuk avatar (maks. 2 huruf): "Budi Santoso" → "BS",
 * "budi" → "B", kosong → "?".
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters =
    words.length === 1
      ? [words[0].charAt(0)]
      : [words[0].charAt(0), words[words.length - 1].charAt(0)];
  return letters.join("").toUpperCase();
}

/** Jumlah digit maksimum yang bisa diketik di input nominal. */
export const AMOUNT_INPUT_MAX_DIGITS = 13;

/** Bagian desimal di akhir teks: koma + 1–2 digit ("Rp 25.000,00", "1,5"). */
const TRAILING_DECIMAL = /,\d{1,2}\s*$/;

/**
 * Ambil digit dari teks input nominal: "Rp 1.500.000" → "1500000".
 * Bagian desimal di akhir diabaikan (Rupiah penuh): "Rp 25.000,00" → "25000",
 * "1.500.000,50" → "1500000"; koma + 3 digit tetap pemisah ribuan
 * ("25,000" → "25000"). Nol di depan dibuang ("007" → "7", "0" tetap "0"),
 * maksimal `AMOUNT_INPUT_MAX_DIGITS` digit. Kosong → "".
 */
export function parseAmountInput(text: string): string {
  const digits = text
    .replace(TRAILING_DECIMAL, "")
    .replace(/\D/g, "")
    .slice(0, AMOUNT_INPUT_MAX_DIGITS);
  if (digits === "") return "";
  return digits.replace(/^0+(?=\d)/, "");
}

/** String digit → tampilan input nominal: "1500000" → "Rp 1.500.000", "" → "". */
export function formatAmountInput(digits: string): string {
  return digits === "" ? "" : formatRupiah(BigInt(digits));
}

/** Satuan singkat Rupiah, dari terbesar: triliun, miliar, juta, ribu. */
const SHORT_UNITS = [
  { size: BigInt(1_000_000_000_000), suffix: "T" },
  { size: BigInt(1_000_000_000), suffix: "M" },
  { size: BigInt(1_000_000), suffix: "jt" },
  { size: BigInt(1_000), suffix: "rb" },
] as const;

/**
 * Nominal Rupiah singkat untuk label chart (tengah donut, sumbu grafik):
 * "Rp 2 jt", "Rp 1,2 jt", "Rp 500 rb", "Rp 1,5 M", "Rp 900". Dibulatkan ke
 * 1 desimal (half-up, ",0" dibuang); hasil pembulatan yang mencapai 1.000
 * naik ke satuan berikutnya ("Rp 999.960" → "Rp 1 jt"). Nominal lengkap tetap
 * tampil di daftar/tooltip (`formatRupiah`).
 */
export function formatRupiahShort(value: bigint | number): string {
  const amount = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  const negative = amount < BigInt(0);
  const abs = negative ? -amount : amount;
  const sign = negative ? "-" : "";
  if (abs < BigInt(1_000)) return formatRupiah(amount);
  const units = [...SHORT_UNITS].reverse();
  for (let i = 0; i < units.length; i++) {
    const { size, suffix } = units[i];
    const next = units[i + 1];
    if (next && abs >= next.size) continue;
    // Persepuluhan satuan, dibulatkan half-up.
    const tenths = (abs * BigInt(10) + size / BigInt(2)) / size;
    if (next && tenths >= BigInt(10_000)) continue;
    const whole = (tenths / BigInt(10))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const decimal = tenths % BigInt(10);
    return `${sign}Rp ${whole}${decimal > BigInt(0) ? `,${decimal}` : ""} ${suffix}`;
  }
  return formatRupiah(amount);
}

/** Persentase dalam persepuluhan → "12,5%" (125 → "12,5%", 1000 → "100,0%"). */
export function formatPercentTenths(tenths: number): string {
  const whole = Math.trunc(tenths / 10);
  return `${whole},${Math.abs(tenths % 10)}%`;
}
