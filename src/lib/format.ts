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
