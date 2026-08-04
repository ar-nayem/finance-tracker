const ISO_CODE: Record<string, string> = {
  RMB: "CNY",
  BDT: "BDT",
};

export function formatMoney(amount: number, currency: string): string {
  const iso = ISO_CODE[currency] ?? currency;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: iso,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency}`;
  }
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(date);
}
