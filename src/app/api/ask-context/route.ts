// GET /api/ask-context → every dataset on this dashboard as compact text, read by the "Ask AI" assistant.
import { stats, monthly, trailing, onchain, chainTotals, market, treasuryUsdc, pricing, x402 } from "@/lib/laso";
import { table, fromJson, contextResponse } from "@/lib/ask-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const [{ headline, days }, m, tre, prices] = await Promise.all([stats(), market(), treasuryUsdc(), pricing().catch(() => [])]);
  return contextResponse([
    `# Laso Finance dashboard (laso.paultimofeev.com)
Pages: Overview (/), Token (/token), Agents (/agents, x402 payments), Model (/model), How it works (/how-it-works).
Data: volume, revenue and spenders from Laso's public stats API (hourly); LASO price and supply from CoinGecko; treasury USDC from Solana RPC; stablecoin deposits on 7 chains from Blockscout, Alchemy and Helius (daily); x402 payments on Base from Alchemy (daily).
Method: deposits = inbound USDC, USDT, DAI (and bridged USDC) to Laso addresses, excluding transfers from Laso addresses and amounts under $0.01, stablecoins at $1. x402 = USDC transfers into 0x3291…2b37 on Base via transferWithAuthorization / receiveWithAuthorization.
`,
    fromJson("Headline", headline),
    fromJson("LASO market (CoinGecko)", m),
    `Treasury USDC: ${tre ?? "n/a"}\n`,
    fromJson("Trailing windows", { d7: trailing(days, 7), d30: trailing(days, 30), d90: trailing(days, 90) }),
    table("By month", monthly(days) as unknown as Record<string, unknown>[]),
    table("By day (volume, revenue, treasury)", days as unknown as Record<string, unknown>[], { max: 200, cols: ["day", "volume", "revenue", "treasury"] }),
    fromJson("Onchain deposits", onchain, { max: 150 }),
    fromJson("Deposits by chain", chainTotals()),
    fromJson("x402 payments on Base", x402, { max: 150 }),
    table("Pricing (fees by product and route)", prices as unknown as Record<string, unknown>[]),
  ]);
}
