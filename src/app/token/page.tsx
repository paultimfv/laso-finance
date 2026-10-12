import { stats, trailing, market, treasuryUsdc, LASO_MINT, TREASURY } from "@/lib/laso";
import { Counter, Counters, Card, Panel, Section, Note, PageHeader, StackedBars, SimpleArea, Table } from "@/components/charts";
import { fmtUsd, fmtPct } from "@/lib/fmt";

export const revalidate = 3600;

/* final supply after the $1M raise (about.laso.finance, "LASO Token Supply"); shares computed here from the counts */
const SUPPLY = [
  { bucket: "ICO buyers", tokens: 10_000_000, terms: "unlocked at TGE" },
  { bucket: "Liquidity", tokens: 2_900_000, terms: "pool liquidity" },
  { bucket: "Team performance package", tokens: 17_100_000, terms: "5 tranches; each needs 2x price on a 3-month TWAP; none before Jul 2028" },
];
const TOTAL = SUPPLY.reduce((a, r) => a + r.tokens, 0);

export default async function Page() {
  const [{ days }, m, tre] = await Promise.all([stats(), market(), treasuryUsdc()]);
  const t30 = trailing(days, 30);
  const sent = days.filter((d) => d.treasury != null).map((d) => ({ day: d.day, treasury_usd: d.treasury! }));
  let cum = 0;
  const sentCum = sent.map((d) => ({ day: d.day, treasury_usd: (cum += d.treasury_usd) }));

  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 pb-10 pt-12">
      <PageHeader title="LASO">
        MetaDAO ownership token on Solana, launched Jul 4, 2026 after a $1M raise at a $3M FDV. Holders have claims on the treasury and IP, and treasury actions
        go through decision markets. Mint <code>{LASO_MINT.slice(0, 8)}…{LASO_MINT.slice(-4)}</code>.
      </PageHeader>

      <Section title="Market" lede="Price and supply from CoinGecko. Treasury USDC read from Solana.">
        <Counters cols="md:grid-cols-3 lg:grid-cols-6">
          <Counter label="Price" value={m ? `$${m.price.toFixed(4)}` : "—"} sub={m ? `high $${m.ath.toFixed(3)}, low $${m.atl.toFixed(3)}` : "CoinGecko unavailable"} />
          <Counter label="FDV" value={m ? fmtUsd(m.fdv) : "—"} sub={m ? `${(m.supply / 1e6).toFixed(1)}M tokens` : ""} />
          <Counter label="Market cap" value={m ? fmtUsd(m.mcap) : "—"} sub={m ? `${(m.circ / 1e6).toFixed(1)}M circulating` : ""} />
          <Counter label="Treasury USDC" value={tre != null ? fmtUsd(tre) : "—"} sub={`${TREASURY.slice(0, 4)}…${TREASURY.slice(-4)} on Solana`} />
          <Counter label="Market cap / treasury" value={m && tre ? `${(m.mcap / tre).toFixed(2)}x` : "—"} sub="USDC only; other assets not counted" />
          <Counter label="FDV / revenue" value={m ? `${(m.fdv / t30.annualRevenue).toFixed(1)}x` : "—"} sub={`on ${fmtUsd(t30.annualRevenue)} annualized (30 days)`} />
        </Counters>
        <Note>24-hour trading volume: {m ? fmtUsd(m.vol24) : "—"}. Thin markets move on small orders.</Note>
      </Section>

      <Section title="Revenue to treasury" lede="Since Jul 7, 2026 Laso sends each day's revenue onchain to the treasury wallet. Each transfer is listed with its Solana transaction on laso.finance/stats.">
        <Counters cols="md:grid-cols-3">
          <Counter label="Sent to treasury" value={fmtUsd(cum)} sub={`${sent.length} daily transfers`} />
          <Counter label="Average transfer" value={fmtUsd(sent.length ? cum / sent.length : 0)} sub="per day" />
          <Counter label="Team allowance" value="$50K / month" sub="paid from the treasury" />
        </Counters>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Daily revenue sent to treasury" sub="USDC"><StackedBars data={sent} x="day" ys={["treasury_usd"]} /></Card>
          <Card title="Cumulative revenue sent to treasury" sub="USDC"><SimpleArea data={sentCum} x="day" y="treasury_usd" /></Card>
        </div>
      </Section>

      <Section title="Supply">
        <Panel title="LASO supply" sub="Token counts from about.laso.finance. Shares computed from the counts.">
          <Table rows={SUPPLY.map((r) => ({ ...r, share: r.tokens / TOTAL }))} cols={[
            { key: "bucket", title: "Bucket" }, { key: "tokens", title: "Tokens", fmt: "int" }, { key: "share", title: "Share", fmt: "pct" }, { key: "terms", title: "Terms" },
          ]} />
        </Panel>
        <Note>Circulating supply on CoinGecko ({m ? `${(m.circ / 1e6).toFixed(2)}M` : "—"}) matches ICO + liquidity (12.9M). Laso&apos;s supply page lists 33% / 7.25% / 59.75%; the token counts give {fmtPct(10 / 30)} / {fmtPct(2.9 / 30)} / {fmtPct(17.1 / 30)}.</Note>
      </Section>
    </main>
  );
}
