export function decimalToCents(n: number): number {
  // *100 then round; multiply via toFixed string to avoid float drift
  const str = (n * 100).toFixed(0);
  return parseInt(str, 10);
}

export function centsToDecimal(c: number): number {
  return c / 100;
}

const formatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export function formatEUR(cents: number): string {
  // Normalize non-breaking spaces (and narrow NBSP) to regular spaces.
  return formatter.format(centsToDecimal(cents)).replace(/[  ]/g, " ");
}
