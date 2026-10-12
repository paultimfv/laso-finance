# laso-finance

Dashboard and onchain data pipeline for Laso Finance.

Live: https://laso-finance.vercel.app

## Data

| Data | Source | Refresh |
|---|---|---|
| Volume, revenue, spenders | Laso public stats API | hourly |
| LASO price, supply | CoinGecko | hourly |
| Treasury USDC | Solana RPC | hourly |
| Stablecoin deposits, 7 chains | Blockscout (Ethereum, Arbitrum, Optimism), Alchemy (Base, Polygon, BNB), Helius (Solana) | daily |
| x402 payments, Base | Alchemy | daily |

## Method

Deposits: inbound USDC, USDT, DAI (and bridged USDC) to the addresses in `scripts/addresses.py`.
Excludes transfers from Laso addresses and amounts under $0.01. Stablecoins counted at $1.

x402: USDC transfers into `0x3291…2b37` on Base made through `transferWithAuthorization` /
`receiveWithAuthorization`. No minimum amount.

Solana sweeps: Solana deposits where a Laso wallet paid the fee (per-payer deposit addresses swept
to the main wallet). Upper bound on agent volume; includes non-agent deposits.

## Layout

```
scripts/addresses.py       Laso addresses, token contracts
scripts/pull_deposits.py   fetch deposits -> data/raw/{chain}.jsonl (incremental)
scripts/build_deposits.py  data/raw -> src/data/deposits.json
scripts/pull_x402.py       fetch Base USDC transfers + tx selectors -> data/raw/x402_base.jsonl
scripts/build_x402.py      -> src/data/x402.json
src/                       Next.js app
.github/workflows/daily.yml
```

## Run

```
python3 scripts/pull_deposits.py ethereum arbitrum optimism base polygon bnb solana
python3 scripts/pull_x402.py
python3 scripts/build_deposits.py
python3 scripts/build_x402.py
npm install && npm run dev
```

Env: `RPC_URL` (Alchemy), `BLOCKSCOUT_KEY`, `HELIUS_KEY`. Daily run via GitHub Actions; the commit redeploys on Vercel.
