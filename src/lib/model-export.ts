// Model export: a dated series (daily "YYYY-MM-DD" or monthly "YYYY-MM") rolled up to years, quarters or months,
// laid out like a model sheet (metrics as rows, periods as columns) so Google Sheets can IMPORTDATA it.
// Same shape as maple.paultimofeev.com/api/model. The current period is marked "(to date)".
export type Period = "year" | "quarter" | "month";
export type Row = { d: string } & Record<string, unknown>;
export type Metric =
  | { section: string; label: string; key: string; agg: "sum" | "last" | "avg" }
  | { section: string; label: string; key: string; agg: "ratio"; num: string; den: string };

const n = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

function keyOf(d: string, p: Period) {
  const y = d.slice(0, 4), m = Number(d.slice(5, 7));
  return p === "year" ? y : p === "quarter" ? `${y} Q${Math.ceil(m / 3)}` : d.slice(0, 7);
}

export function rollup(rows: Row[], metrics: Metric[], period: Period, from = "") {
  const groups = new Map<string, Row[]>();
  for (const r of [...rows].sort((a, b) => a.d.localeCompare(b.d))) {
    if (r.d < from) continue;
    const k = keyOf(r.d, period);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const nowKey = keyOf(new Date().toISOString().slice(0, 10), period);
  return [...groups].map(([k, rs]) => {
    const sum = (key: string) => { const v = rs.map((r) => n(r[key])).filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
    const values: Record<string, number | null> = {};
    for (const m of metrics) {
      if (m.agg === "sum") values[m.key] = sum(m.key);
      else if (m.agg === "avg") { const s = sum(m.key), c = rs.filter((r) => n(r[m.key]) != null).length; values[m.key] = s == null ? null : s / c; }
      else if (m.agg === "last") { let v: number | null = null; for (const r of rs) v = n(r[m.key]) ?? v; values[m.key] = v; }
      else if (m.agg === "ratio") { const a = sum(m.num), b = sum(m.den); values[m.key] = a == null || !b ? null : a / b; }
    }
    return { period: k === nowKey ? `${k} (to date)` : k, values };
  });
}

export function toCsv(metrics: Metric[], periods: ReturnType<typeof rollup>) {
  const cell = (v: number | null) => (v == null ? "" : Math.abs(v) < 10 && v % 1 ? v.toFixed(4) : String(Math.round(v)));
  const lines = [["section", "metric", ...periods.map((p) => p.period)].join(",")];
  for (const m of metrics) lines.push([m.section, `"${m.label}"`, ...periods.map((p) => cell(p.values[m.key]))].join(","));
  return lines.join("\n") + "\n";
}

/** GET handler body: ?period=year|quarter|month (default month), ?from=YYYY-MM-DD, ?format=csv|json */
export function respond(request: Request, rows: Row[], metrics: Metric[], meta: Record<string, unknown> = {}) {
  const u = new URL(request.url);
  const p = u.searchParams.get("period");
  const period: Period = p === "year" || p === "quarter" ? p : "month";
  const from = /^\d{4}-\d{2}(-\d{2})?$/.test(u.searchParams.get("from") ?? "") ? u.searchParams.get("from")! : "";
  const periods = rollup(rows, metrics, period, from);
  if (u.searchParams.get("format") === "json") return Response.json({ ...meta, period, from, metrics, periods });
  return new Response(toCsv(metrics, periods), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" },
  });
}
