function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function monthStartDate(monthKey: string) {
  return `${monthKey}-01`;
}

export function monthEndDate(monthKey: string) {
  const m = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!m) return `${monthKey}-31`;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  // day=0 of next month => last day of current month
  const end = new Date(Date.UTC(y, mo, 0));
  return `${end.getUTCFullYear()}-${pad2(end.getUTCMonth() + 1)}-${pad2(end.getUTCDate())}`;
}

export function monthRange(monthKey: string) {
  const from = monthStartDate(monthKey);
  const to = monthEndDate(monthKey);
  return { from, to };
}

export function monthRangeTs(monthKey: string) {
  const { from, to } = monthRange(monthKey);
  return { fromTs: `${from}T00:00:00`, toTs: `${to}T23:59:59` };
}

