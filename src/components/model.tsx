"use client";
import { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from "recharts";
import { usePalette } from "@/components/charts";
import { fmtUsd } from "@/lib/fmt";

export type ModelInputs = {
  asOf: string; x402Share: number; volume30: number; take30: number; take365: number; price: number; supply: number; circ: number; treasury: number; fdv: number;
};

const MONTHS = 24;
const ALLOWANCE = 50_000;           // team allowance per month, from the treasury (about.laso.finance)
const AGENT_SHARE_NOW = 0.03;       // Laso: agents are 2–4% of volume

type Params = { humanGrowth: number; agentGrowth: number; take: number; multiple: number; allowance: number; circBasis: boolean };
type Row = { m: string; human: number; agent: number; revenue: number; treasury: number };

const usd = (v: number) => fmtUsd(v);
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;

/** monthly path: human and agent volume compound at their own annual rates; revenue → treasury, allowance out */
function run(inp: ModelInputs, p: Params) {
  const gh = Math.pow(1 + p.humanGrowth, 1 / 12), ga = Math.pow(1 + p.agentGrowth, 1 / 12);
  let human = inp.volume30 * (1 - AGENT_SHARE_NOW), agent = inp.volume30 * AGENT_SHARE_NOW, treasury = inp.treasury;
  const rows: Row[] = [];
  for (let i = 1; i <= MONTHS; i++) {
    human *= gh; agent *= ga;
    const revenue = (human + agent) * p.take;
    treasury += revenue - p.allowance;
    rows.push({ m: `M${i}`, human, agent, revenue, treasury });
  }
  const at12 = rows[11], next12 = rows.slice(12, 24).reduce((a, r) => a + r.revenue, 0), first12 = rows.slice(0, 12).reduce((a, r) => a + r.revenue, 0);
  const fdv = Math.max(0, p.multiple * next12 + Math.max(at12.treasury, 0));
  const tokens = p.circBasis ? inp.circ : inp.supply;
  const firstNeg = rows.findIndex((r) => r.treasury < 0);
  return { rows, first12, next12, treasury12: at12.treasury, fdv, price: fdv / tokens, agentShare12: at12.agent / (at12.human + at12.agent), runway: firstNeg < 0 ? null : firstNeg + 1 };
}

function Slider({ id, label, value, min, max, step, fmt, onChange, hint }: {
  id: string; label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm text-ink-2">{label}</label>
        <span className="font-mono text-sm tabular-nums text-ink">{fmt(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export default function Model({ inp }: { inp: ModelInputs }) {
  const pal = usePalette();
  /* starting point = today's run-rate: no growth, last-30-day take rate, today's FDV / forward revenue */
  const base: Params = useMemo(() => ({
    humanGrowth: 0, agentGrowth: 0, take: inp.take30, allowance: ALLOWANCE, circBasis: false,
    multiple: Math.max(0, (inp.fdv - inp.treasury) / (inp.volume30 * 12 * inp.take30)),
  }), [inp]);
  const [p, setP] = useState<Params>(base);
  const set = (k: keyof Params) => (v: number | boolean) => setP((x) => ({ ...x, [k]: v }));
  const r = useMemo(() => run(inp, p), [inp, p]);
  const mult = r.price / inp.price;

  const tick = { fill: pal.axis, fontSize: 10.5, fontFamily: "var(--font-code)" };
  const tip = { contentStyle: { background: pal.surface, border: `1px solid ${pal.grid}`, borderRadius: 3, fontSize: 12 }, labelStyle: { color: pal.ink, fontWeight: 600 }, itemStyle: { color: pal.ink2, padding: 0 } };

  return (
    <div className="grid gap-8">
      <div className="grid gap-px overflow-hidden rounded-[4px] border border-line bg-line md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="bg-surface p-5">
          <div className="text-[12px] text-muted">LASO price in 12 months</div>
          <div className="num mt-2 text-[48px] font-light leading-none text-ink">${r.price.toFixed(3)}</div>
          <div className={`mt-1 text-sm ${mult >= 1 ? "text-up" : "text-down"}`}>{mult.toFixed(2)}x today&apos;s ${inp.price.toFixed(4)}</div>
        </div>
        {[["Implied FDV", usd(r.fdv), `${p.multiple.toFixed(1)}x forward revenue + treasury`],
          ["Revenue, next 12 months", usd(r.first12), `then ${usd(r.next12)} in months 13–24`],
          ["Treasury in 12 months", usd(r.treasury12), r.runway ? `runs out in month ${r.runway}` : "never runs out in 24 months"]].map(([l, v, s]) => (
          <div key={l} className="bg-surface p-5">
            <div className="text-[12px] text-muted">{l}</div>
            <div className="num mt-2 text-[24px] leading-none text-ink">{v}</div>
            <div className={`mt-1 text-xs ${l.startsWith("Treasury") && r.runway ? "text-down" : "text-muted"}`}>{s}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="grid content-start gap-5 rounded-[4px] border border-line bg-surface p-5">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setP(base)} className="rounded-[4px] border border-line-strong px-3 py-1.5 text-[13px] text-ink hover:border-accent hover:text-accent-ink">Today&apos;s run-rate</button>
          </div>
          <div className="border-t border-line pt-3 text-[12.5px] font-medium text-ink-2">Volume</div>
          <Slider id="hg" label="Human volume growth, per year" value={p.humanGrowth} min={-0.5} max={2} step={0.05} fmt={(v) => pct(v, 0)} onChange={set("humanGrowth")} hint={`Starts at ${usd(inp.volume30 * (1 - AGENT_SHARE_NOW))} / month`} />
          <Slider id="ag" label="Agent volume growth, per year" value={p.agentGrowth} min={-0.5} max={20} step={0.25} fmt={(v) => pct(v, 0)} onChange={set("agentGrowth")} hint={`Starts at ${pct(AGENT_SHARE_NOW, 0)} of volume, Laso's stated 2–4%. Measured x402 on Base: ${pct(inp.x402Share)}. ${pct(r.agentShare12)} in 12 months.`} />
          <div className="border-t border-line pt-3 text-[12.5px] font-medium text-ink-2">Economics</div>
          <Slider id="take" label="Take rate (revenue ÷ volume)" value={p.take} min={0.02} max={0.07} step={0.001} fmt={(v) => pct(v, 1)} onChange={set("take")} hint={`Last 30 days ${pct(inp.take30, 2)}, 365 days ${pct(inp.take365, 2)}, Laso's target 4.8%`} />
          <Slider id="alw" label="Treasury outflow per month" value={p.allowance} min={0} max={150_000} step={5000} fmt={usd} onChange={set("allowance")} hint="Team allowance today: $50K" />
          <div className="border-t border-line pt-3 text-[12.5px] font-medium text-ink-2">Valuation</div>
          <Slider id="mult" label="FDV ÷ forward revenue (ex treasury)" value={p.multiple} min={0} max={30} step={0.5} fmt={(v) => `${v.toFixed(1)}x`} onChange={set("multiple")} hint={`Today ${base.multiple.toFixed(1)}x. Laso raised at 5.5x.`} />
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" checked={p.circBasis} onChange={(e) => set("circBasis")(e.target.checked)} />
            Price on circulating supply ({(inp.circ / 1e6).toFixed(1)}M, excludes locked team tokens)
          </label>
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-[4px] border border-line bg-surface p-4">
            <div className="mb-2 text-[13px] font-medium text-ink">Monthly revenue</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={r.rows.map((x) => ({ m: x.m, human: x.human * p.take, agents: x.agent * p.take }))} margin={{ top: 4, right: 14, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={pal.grid} vertical={false} />
                  <XAxis dataKey="m" tick={tick} tickLine={false} axisLine={{ stroke: pal.grid }} interval={2} />
                  <YAxis tickFormatter={usd} width={58} tick={tick} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} formatter={(v, n) => [usd(Number(v)), String(n)]} cursor={{ fill: pal.grid, fillOpacity: 0.4 }} />
                  <Legend iconType="square" iconSize={8} align="left" verticalAlign="top" wrapperStyle={{ paddingBottom: 8 }} formatter={(v) => <span style={{ color: pal.ink2, fontSize: 12 }}>{String(v)}</span>} />
                  <Bar dataKey="human" name="People" stackId="1" fill={pal.series[0]} maxBarSize={24} isAnimationActive={false} />
                  <Bar dataKey="agents" name="Agents" stackId="1" fill={pal.series[1]} maxBarSize={24} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <ReferenceLine y={p.allowance} ifOverflow="extendDomain" stroke={pal.ref} strokeDasharray="3 3" label={{ value: "treasury outflow", fill: pal.axis, fontSize: 10, position: "insideTopLeft" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-[4px] border border-line bg-surface p-4">
            <div className="mb-2 text-[13px] font-medium text-ink">Treasury USDC</div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={r.rows} margin={{ top: 4, right: 14, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={pal.grid} vertical={false} />
                  <XAxis dataKey="m" tick={tick} tickLine={false} axisLine={{ stroke: pal.grid }} interval={2} />
                  <YAxis tickFormatter={usd} width={58} tick={tick} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} formatter={(v) => [usd(Number(v)), "Treasury"]} />
                  <ReferenceLine y={0} stroke={pal.axis} />
                  <Line dataKey="treasury" stroke={pal.series[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
