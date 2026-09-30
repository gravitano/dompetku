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

/**
 * Ambil digit dari teks input nominal: "Rp 1.500.000" → "1500000".
 * Nol di depan dibuang ("007" → "7", "0" tetap "0"), maksimal
 * `AMOUNT_INPUT_MAX_DIGITS` digit. Kosong → "".
 */
export function parseAmountInput(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, AMOUNT_INPUT_MAX_DIGITS);
  if (digits === "") return "";
  return digits.replace(/^0+(?=\d)/, "");
}

/** String digit → tampilan input nominal: "1500000" → "Rp 1.500.000", "" → "". */
export function formatAmountInput(digits: string): string {
  return digits === "" ? "" : formatRupiah(BigInt(digits));
}
