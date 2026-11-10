// GET /api/model: Laso's volume and revenue (Laso's public stats API, daily) plus onchain card deposits by chain
// and x402 payments (hourly pipeline), rolled up for a model sheet.
//   ?period=month (default) | quarter | year    ?from=2024-07-01    ?format=csv (default) | json
// Google Sheets: =IMPORTDATA("<this site>/api/model?period=month")
import { stats, getOnchain, getX402, CHAIN } from "@/lib/laso";
import { respond, type Metric, type Row } from "@/lib/model-export";

export const revalidate = 300;

const CHAINS = ["ethereum", "solana", "base", "polygon", "arbitrum", "bnb", "optimism"];

const METRICS: Metric[] = [
  { section: "VOLUME", label: "Card spend volume USD (Laso-reported)", key: "volume", agg: "sum" },
  { section: "REVENUE", label: "Revenue USD (Laso-reported, from Jul 2024)", key: "revenue", agg: "sum" },
  { section: "REVENUE", label: "Take rate (revenue / volume)", key: "take", agg: "ratio", num: "revenue", den: "volumeRev" },
  { section: "REVENUE", label: "Revenue sent to treasury USD", key: "treasury", agg: "sum" },
  { section: "ONCHAIN DEPOSITS", label: "Card top-up deposits USD (all chains)", key: "dep_total", agg: "sum" },
  ...CHAINS.map((c): Metric => ({ section: "ONCHAIN DEPOSITS", label: `  ${CHAIN[c] ?? c}`, key: `dep_${c}`, agg: "sum" })),
  { section: "AGENTS (x402)", label: "x402 payments USD", key: "x402_usd", agg: "sum" },
  { section: "AGENTS (x402)", label: "x402 payments (count)", key: "x402_payments", agg: "sum" },
  { section: "AGENTS (x402)", label: "x402 share of volume", key: "x402_share", agg: "ratio", num: "x402_usd", den: "volume" },
  { section: "AGENTS (x402)", label: "Other USDC transfers in USD", key: "transfer_usd", agg: "sum" },
];

export async function GET(request: Request) {
  const [{ days }, onchain, x402] = await Promise.all([stats(), getOnchain(), getX402()]);
  const rows: Row[] = days.map((d) => ({
    d: d.day, volume: d.volume, revenue: d.day >= "2024-07-01" ? d.revenue : null,
    volumeRev: d.day >= "2024-07-01" && d.revenue != null ? d.volume : null, treasury: d.treasury,
  }));
  for (const r of onchain.monthlyByChain) rows.push({ d: r.month.slice(0, 10), [`dep_${r.chain}`]: r.volume_usd, dep_total: r.volume_usd });
  for (const r of x402.monthly) rows.push({ d: String(r.month).slice(0, 10), x402_usd: r.x402_usd, x402_payments: r.x402_payments, transfer_usd: r.transfer_usd });
  return respond(request, rows, METRICS, { source: "Laso public stats API (volume, revenue) + onchain deposits and x402 (hourly)", onchainBuiltAt: onchain.builtAt });
}
