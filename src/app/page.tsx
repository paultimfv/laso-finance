import { stats, monthly, trailing, onchain, chainTotals, CHAIN } from "@/lib/laso";
import { Counter, Counters, Card, Panel, Section, Note, StackedBars, StackedColumns, SimpleLine, CategoryBars, Table } from "@/components/charts";
import { LedgerCard } from "@/components/ledger-card";
import { fmtUsd, fmtPct } from "@/lib/fmt";

export const revalidate = 3600;

export default async function Page() {
  const { headline: h, days } = await stats();
  const months = monthly(days);
  const full = months.slice(0, -1);               // drop the partial current month from monthly charts
  const t30 = trailing(days, 30), t365 = trailing(days, 365);
  const asOf = days[days.length - 1]?.day;
  const chains = chainTotals();
  const addr = onchain.byAddress.slice(0, 12).map((r) => ({ ...r, chain: CHAIN[r.chain] ?? r.chain }));
  const t = onchain.totals;
  const covered = Object.keys(onchain.coverage).map((c) => CHAIN[c] ?? c);
  const missing = ["ethereum", "solana", "polygon", "arbitrum", "base", "bnb", "optimism"].filter((c) => !(c in onchain.coverage)).map((c) => CHAIN[c]);

  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 pb-10 pt-12">
      <header className="grid items-center gap-10 md:grid-cols-[1fr_460px]">
        <div className="space-y-5">
          <h1 className="text-[clamp(30px,4.6vw,44px)] font-medium leading-[1.05] tracking-[-0.045em] text-ink">Laso Finance</h1>
          <p className="max-w-[56ch] text-[14px] leading-[1.7] text-ink-2">
            Laso turns stablecoins into prepaid cards, gift cards and bank payouts without an ID upload, for people and for AI agents.
            This dashboard tracks the business from Laso&apos;s own ledger and from chain data.
          </p>
          <div className="font-mono text-[11.5px] text-muted">data as of {asOf}</div>
        </div>
        <LedgerCard total={h.totalVolume} volume30={h.thirtyDayVolume} revenue30={t30.revenue} asOf={asOf} />
      </header>

      <Section title="Business" lede="Volume is stablecoins paid into the platform. Revenue is fees plus issuer discounts, net of refunds, referral payouts and some direct costs. Revenue divided by volume is the realized take rate.">
        <Counters cols="md:grid-cols-3 lg:grid-cols-6">
          <Counter label="Volume, all time" value={fmtUsd(h.totalVolume)} sub="series starts Jan 2024" />
          <Counter label="Revenue, all time" value={fmtUsd(h.totalRevenue)} sub="from Jun 24, 2024" />
          <Counter label="Volume, 30 days" value={fmtUsd(h.thirtyDayVolume)} sub={`${h.thirtyDayTransactions.toLocaleString()} transactions`} />
          <Counter label="Revenue, 30 days" value={fmtUsd(t30.revenue)} sub={`${fmtUsd(t30.annualRevenue)} annualized`} />
          <Counter label="Take rate, 30 days" value={fmtPct(t30.take)} sub={`${fmtPct(t365.take)} over 365 days`} />
          <Counter label="Active spenders" value={h.monthlyActiveSpenders.toLocaleString()} sub={`last 30 days, ${fmtUsd(h.thirtyDayVolume / h.monthlyActiveSpenders)} each`} />
        </Counters>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Monthly volume" sub="USD paid into the platform, full months"><StackedBars data={full} x="month" ys={["volume_usd"]} /></Card>
          <Card title="Monthly revenue" sub="net revenue in USD, from Jul 2024"><StackedBars data={full.filter((m) => m.revenue_usd != null)} x="month" ys={["revenue_usd"]} /></Card>
          <Card title="Take rate" sub="monthly revenue divided by volume"><SimpleLine data={full.filter((m) => m.take_rate != null)} x="month" ys={["take_rate"]} fmt="pct" /></Card>
          <Card title="Daily volume" sub="last 180 days"><StackedBars data={days.slice(-180).map((d) => ({ day: d.day, volume_usd: d.volume }))} x="day" ys={["volume_usd"]} /></Card>
        </div>
        <Note>
          Laso recomputed its revenue history after methodology changes on Aug 18 and Sep 3, 2026, subtracting the costs of earning revenue and banking costs,
          so the take-rate decline is not a definition change. Laso&apos;s stated target is a 4.8% blended take rate before costs.
        </Note>
      </Section>

      <Section title="Deposits onchain" lede="Where the money comes in: every USDC, USDT and DAI transfer into Laso's published deposit addresses, excluding transfers between Laso's own wallets.">
        <Counters cols="md:grid-cols-3 lg:grid-cols-5">
          <Counter label="Deposits, all time" value={fmtUsd(t.volume_usd)} sub={missing.length ? `${covered.length} chains; ${missing.join(", ")} loading` : `${covered.length} chains`} />
          <Counter label="Deposit transfers" value={t.deposits.toLocaleString()} sub={`${fmtUsd(t.volume_usd / t.deposits)} average`} />
          <Counter label="Sending wallets" value={t.senders.toLocaleString()} sub="one person can use several" />
          <Counter label="Largest chain" value={chains[0].chain} sub={`${fmtPct(chains[0].share)} of all-time deposits`} />
          <Counter label="Deposits ÷ ledger volume" value={`${(onchain.volumeSince2024 / h.totalVolume).toFixed(2)}x`} sub={`since 2024; ${(onchain.volume30d / h.thirtyDayVolume).toFixed(2)}x over 30 days`} />
        </Counters>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Monthly deposits by chain" sub="USD, latest month partial"><StackedColumns data={onchain.monthlyByChain} x="month" y="volume_usd" group="chain" /></Card>
          <Card title="All-time deposits by chain" sub="USD"><CategoryBars data={chains} x="chain" y="volume_usd" /></Card>
        </div>
        <Panel title="Deposit addresses" sub="Top 12 by all-time volume. Product labels are Laso's.">
          <Table rows={addr} cols={[
            { key: "address", title: "Address", fmt: "addr" }, { key: "chain", title: "Chain" }, { key: "flow", title: "Used for" },
            { key: "volume_usd", title: "Volume", fmt: "usd" }, { key: "deposits", title: "Deposits", fmt: "int" }, { key: "first", title: "First" }, { key: "last", title: "Last" },
          ]} />
        </Panel>
        <Note>
          Pulled {onchain.builtAt} from Blockscout, Alchemy and Helius, with stablecoins counted at $1. Chains: {covered.join(", ")}{missing.length ? `. Not yet loaded: ${missing.join(", ")}` : ""}. Deposits run above the ledger volume because they include
          money that sits in account balances before it is spent, and Laso says the onchain count overstates real volume. Read this section for chain mix and
          direction, and the ledger for totals.
        </Note>
      </Section>
    </main>
  );
}
