/* Data layer. Three live sources, cached for an hour, plus our own onchain pull:
   1. Laso's public stats functions (the same calls laso.finance/stats makes; internal-ledger numbers)
   2. LASO market data (CoinGecko)
   3. Treasury USDC balance (Solana RPC)
   4. Every stablecoin transfer into Laso's deposit addresses, pulled from chain sources by
      scripts/pull_deposits.py and rolled up by scripts/build_deposits.py into src/data/deposits.json */
import deposits from "@/data/deposits.json";

const HOUR = 3600;
const FN = "https://us-central1-kyc-ts.cloudfunctions.net";

export const LASO_MINT = "LASocYgQAo8GfypSjedNQgLft8y8DVGg1kSqR3smeta";
export const TREASURY = "DsrBwJXCtMAdPJVuFR4rAdxKp5M6M3FDvxsGwoLAF2QZ";
const USDC_SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

async function callable<T>(name: string): Promise<T> {
  const r = await fetch(`${FN}/${name}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: null }), next: { revalidate: HOUR },
  });
  if (!r.ok) throw new Error(`${name}: ${r.status}`);
  return (await r.json()).result as T;
}

/* "2024-1-10" → "2024-01-10" */
const iso = (d: string) => { const [y, m, dd] = d.split("-"); return `${y}-${m.padStart(2, "0")}-${dd.padStart(2, "0")}`; };

export type Headline = { totalVolume: number; thirtyDayVolume: number; monthlyActiveSpenders: number; thirtyDayTransactions: number; totalRevenue: number };
export type Day = { day: string; volume: number; revenue: number | null; treasury: number | null; tx: string | null };

export async function stats() {
  const [headline, vol, rev] = await Promise.all([
    callable<Headline>("getPublicVolumeStats"),
    callable<{ points: { date: string; dailyVolume: number }[] }>("getPublicVolumeTimeSeries"),
    callable<{ points: { date: string; dailyRevenue: number; transferState?: string; revenueTransfer?: { amount: number; txHash: string } }[] }>("getPublicRevenueTimeSeries"),
  ]);
  const byDay = new Map<string, Day>();
  for (const p of vol.points) byDay.set(iso(p.date), { day: iso(p.date), volume: p.dailyVolume, revenue: null, treasury: null, tx: null });
  for (const p of rev.points) {
    const d = byDay.get(iso(p.date)) ?? { day: iso(p.date), volume: 0, revenue: null, treasury: null, tx: null };
    d.revenue = p.dailyRevenue;
    if (p.transferState === "transfer-complete" && p.revenueTransfer) { d.treasury = p.revenueTransfer.amount; d.tx = p.revenueTransfer.txHash; }
    byDay.set(d.day, d);
  }
  const days = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  return { headline, days };
}

/** monthly volume, revenue and revenue / volume; revenue only from the first full month it covers (Jul 2024) */
export function monthly(days: Day[]) {
  const m = new Map<string, { month: string; volume_usd: number; revenue_usd: number; has_rev: boolean }>();
  for (const d of days) {
    const k = d.day.slice(0, 7) + "-01";
    const r = m.get(k) ?? { month: k, volume_usd: 0, revenue_usd: 0, has_rev: false };
    r.volume_usd += d.volume;
    if (d.revenue != null) { r.revenue_usd += d.revenue; r.has_rev = true; }
    m.set(k, r);
  }
  return [...m.values()].map((r) => ({
    month: r.month, volume_usd: r.volume_usd,
    revenue_usd: r.month >= "2024-07-01" ? r.revenue_usd : null,
    take_rate: r.month >= "2024-07-01" && r.volume_usd ? r.revenue_usd / r.volume_usd : null,
  }));
}

/** trailing-n-day sums from the daily series */
export function trailing(days: Day[], n: number) {
  const t = days.slice(-n);
  const volume = t.reduce((a, d) => a + d.volume, 0), revenue = t.reduce((a, d) => a + (d.revenue ?? 0), 0);
  return { volume, revenue, take: volume ? revenue / volume : 0, annualRevenue: (revenue * 365) / n };
}

export type Market = { price: number; mcap: number; fdv: number; circ: number; supply: number; vol24: number; ath: number; atl: number };
export async function market(): Promise<Market | null> {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/coins/laso-finance?localization=false&tickers=false&community_data=false&developer_data=false", { next: { revalidate: HOUR } });
    const m = (await r.json()).market_data;
    return { price: m.current_price.usd, mcap: m.market_cap.usd, fdv: m.fully_diluted_valuation.usd, circ: m.circulating_supply, supply: m.total_supply,
      vol24: m.total_volume.usd, ath: m.ath.usd, atl: m.atl.usd };
  } catch { return null; }
}

/** USDC held by the wallet that receives Laso's daily revenue transfers */
export async function treasuryUsdc(): Promise<number | null> {
  try {
    const r = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST", headers: { "content-type": "application/json" }, next: { revalidate: HOUR },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner", params: [TREASURY, { mint: USDC_SOL }, { encoding: "jsonParsed" }] }),
    });
    const v = (await r.json()).result.value as { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }[];
    return v.reduce((a, x) => a + x.account.data.parsed.info.tokenAmount.uiAmount, 0);
  } catch { return null; }
}

/* ---------- Deposits onchain (our pull; stablecoins counted at $1) ---------- */
export const CHAIN: Record<string, string> = { ethereum: "Ethereum", solana: "Solana", polygon: "Polygon", arbitrum: "Arbitrum", base: "Base", bnb: "BNB", optimism: "Optimism", stellar: "Stellar" };

export const onchain = {
  builtAt: deposits.built_at,
  coverage: deposits.coverage as Record<string, string>,
  totals: deposits.totals,
  byAddress: deposits.by_address,
  monthlyByChain: deposits.monthly_by_chain.filter((r) => r.month >= "2023-01-01"),
  topSenders: deposits.top_senders,
  volumeSince2024: deposits.volume_since_2024,
  volume30d: deposits.volume_30d,
  solanaSweeps: deposits.solana_sweeps,
};

/** all-time volume by chain from the address table */
export function chainTotals() {
  const m = new Map<string, number>();
  for (const r of onchain.byAddress) m.set(r.chain, (m.get(r.chain) ?? 0) + r.volume_usd);
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  return [...m.entries()].map(([chain, v]) => ({ chain: CHAIN[chain] ?? chain, volume_usd: v, share: v / total })).sort((a, b) => b.volume_usd - a.volume_usd);
}

export type Price = { product: string; route: string; min_amount: number; max_amount: number; fee_rate: number; min_fee: number; amount_currencies: string[] | null };
/** Laso's live fee schedule (free, unauthenticated endpoint the agent docs point to) */
export async function pricing(): Promise<Price[]> {
  try {
    const r = await fetch("https://laso.finance/get-pricing", { next: { revalidate: HOUR } });
    return (await r.json()).products;
  } catch { return []; }
}

/* ---------- x402 payments to Laso's main Base address (scripts/pull_x402.py → build_x402.py) ---------- */
import x402Data from "@/data/x402.json";
export const x402 = x402Data;
export const LASO_BASE = "0x3291e96b3bff7ed56e3ca8364273c5b4654b2b37";
