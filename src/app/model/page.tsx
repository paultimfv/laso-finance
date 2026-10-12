import { stats, trailing, market, treasuryUsdc, x402 } from "@/lib/laso";
import Model, { type ModelInputs } from "@/components/model";
import { fmtUsd, fmtPct } from "@/lib/fmt";
import { PageHeader } from "@/components/charts";
import { notFound } from "next/navigation";

// hidden until the model is worked out; flip to false to bring the page back
const HIDDEN = true;

export const revalidate = 3600;

export default async function ModelPage() {
  if (HIDDEN) notFound();
  const [{ days }, m, tre] = await Promise.all([stats(), market(), treasuryUsdc()]);
  const t30 = trailing(days, 30), t365 = trailing(days, 365);
  if (!m || tre == null) {
    return <main className="mx-auto max-w-6xl px-4 py-24 text-[13px] text-ink-2">Market or treasury data is unavailable right now. Refresh in a minute.</main>;
  }
  const inp: ModelInputs = {
    asOf: days[days.length - 1].day, x402Share: x402.x402_30d.volume_usd / t30.volume, volume30: t30.volume, take30: t30.take, take365: t365.take,
    price: m.price, supply: m.supply, circ: m.circ, treasury: tre, fdv: m.fdv,
  };
  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 pb-10 pt-12">
      <PageHeader title="Model" asOf={inp.asOf}>
        Starts from today&apos;s run-rate: last-30-day volume and take rate, the treasury balance, and the multiple the market pays now. Move the sliders to set your own view.
      </PageHeader>

      <Model inp={inp} />

      <section className="grid max-w-[78ch] gap-2 border-t border-line pt-6 text-[12px] leading-relaxed text-muted">
        <h2 className="text-[13px] font-medium text-ink-2">How the model works</h2>
        <p>Monthly volume starts at the last 30 days, split 97% people / 3% agents (Laso says agents are 2–4% of volume), and each part compounds at its own annual rate. Revenue = volume × take rate, and all of it goes to the treasury, which pays the team allowance out each month. In 12 months, FDV = multiple × the following 12 months of revenue + the treasury balance. Price = FDV ÷ total supply, or ÷ circulating supply if ticked.</p>
        <p>
          Today&apos;s inputs: 30-day volume {fmtUsd(inp.volume30)}; take rate {fmtPct(inp.take30)} over 30 days and {fmtPct(inp.take365)} over 365; treasury {fmtUsd(inp.treasury)} USDC;
          price ${inp.price.toFixed(4)}; FDV {fmtUsd(inp.fdv)}; supply {(inp.supply / 1e6).toFixed(1)}M, of which {(inp.circ / 1e6).toFixed(1)}M circulating.
        </p>
        <p>Not modeled: costs other than the allowance (Laso reports ~$14K/month of opex, which the allowance is meant to cover), new raises, buybacks, and team-token unlocks (none before Jul 2028).</p>
      </section>
    </main>
  );
}
