"""Roll data/raw/*.jsonl (from pull_deposits.py) into src/data/deposits.json for the dashboard.

Output: per-chain coverage, totals, by-address table, monthly volume by chain, and top senders.
Stablecoins are counted at $1.
"""
import json, pathlib, datetime as dt
from collections import defaultdict

from addresses import EVM, SOLANA, STELLAR

ROOT = pathlib.Path(__file__).resolve().parent.parent
LABEL = {**EVM, **SOLANA, **STELLAR}

rows, coverage = [], {}
CHAINS = ["ethereum", "arbitrum", "optimism", "base", "polygon", "bnb", "solana"]
for f in [ROOT / "data" / "raw" / f"{c}.jsonl" for c in CHAINS]:
    if not f.exists():
        continue
    chain_rows = [json.loads(l) for l in f.open()]
    rows += chain_rows
    if chain_rows:
        coverage[f.stem] = dt.datetime.fromtimestamp(max(r["ts"] for r in chain_rows), dt.timezone.utc).strftime("%Y-%m-%d")

day = lambda r: dt.datetime.fromtimestamp(r["ts"], dt.timezone.utc).strftime("%Y-%m-%d")

by_addr = defaultdict(lambda: {"volume_usd": 0.0, "deposits": 0, "first": "9999", "last": "0000"})
monthly = defaultdict(float)
senders = defaultdict(lambda: {"volume_usd": 0.0, "deposits": 0})
for r in rows:
    d = day(r)
    a = by_addr[(r["address"], r["chain"])]
    a["volume_usd"] += r["amount"]; a["deposits"] += 1
    a["first"] = min(a["first"], d); a["last"] = max(a["last"], d)
    monthly[(d[:7] + "-01", r["chain"])] += r["amount"]
    s = senders[(r["sender"], r["chain"])]
    s["volume_usd"] += r["amount"]; s["deposits"] += 1

# Solana deposits that Laso sweeps in from per-user deposit addresses (Laso's wallet pays the fee).
# Laso says agent deposits arrive this way, but so do people's; chain data can't split them.
last = max(r["ts"] for r in rows)
sweeps = [r for r in rows if r["chain"] == "solana" and r.get("fee_payer") in SOLANA]
sweep_m = defaultdict(lambda: {"volume_usd": 0.0, "deposits": 0})
for r in sweeps:
    m = sweep_m[day(r)[:7] + "-01"]; m["volume_usd"] += r["amount"]; m["deposits"] += 1
recent = [r for r in sweeps if r["ts"] > last - 30 * 86400]

out = {
    "built_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d"),
    "coverage": coverage,
    "totals": {"volume_usd": sum(r["amount"] for r in rows), "deposits": len(rows), "senders": len({(r["sender"], r["chain"]) for r in rows})},
    "by_address": sorted(({"address": k[0], "chain": k[1], "flow": LABEL.get(k[0], "Unknown"), **v} for k, v in by_addr.items()), key=lambda x: -x["volume_usd"]),
    "monthly_by_chain": sorted(({"month": k[0], "chain": k[1], "volume_usd": v} for k, v in monthly.items()), key=lambda x: (x["month"], x["chain"])),
    "volume_since_2024": sum(r["amount"] for r in rows if day(r) >= "2024-01-01"),
    "volume_30d": sum(r["amount"] for r in rows if r["ts"] > last - 30 * 86400),
    "solana_sweeps": {
        "volume_usd": sum(r["amount"] for r in sweeps), "deposits": len(sweeps), "addresses": len({r["sender"] for r in sweeps}),
        "volume_30d": sum(r["amount"] for r in recent), "deposits_30d": len(recent), "addresses_30d": len({r["sender"] for r in recent}),
        "monthly": sorted(({"month": k, **v} for k, v in sweep_m.items() if k >= "2026-01-01"), key=lambda x: x["month"]),
    },
    "top_senders": sorted(({"sender": k[0], "chain": k[1], **v} for k, v in senders.items()), key=lambda x: -x["volume_usd"])[:25],
}
(ROOT / "src" / "data" / "deposits.json").write_text(json.dumps(out, indent=1))
print(f"{out['totals']['deposits']:,} deposits, ${out['totals']['volume_usd']:,.0f}, chains {coverage}")
