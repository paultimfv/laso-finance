"""Roll data/raw/x402_base.jsonl (from pull_x402.py) into src/data/x402.json.

An x402 payment is a USDC transfer into Laso's main Base address made through USDC's
transferWithAuthorization (EIP-3009), which a facilitator submits on the payer's behalf.
Transfers from Laso's own addresses are excluded; so is sub-cent dust from plain transfers (address poisoning).
"""
import json, pathlib, datetime as dt
from collections import defaultdict

from addresses import EVM

ROOT = pathlib.Path(__file__).resolve().parent.parent
AUTH = {"0xe3ee160e", "0xcf092995", "0xef55bec6", "0x88b7ab63"}  # transfer/receiveWithAuthorization, both signature forms

rows = [json.loads(l) for l in (ROOT / "data" / "raw" / "x402_base.jsonl").open()]
day = lambda r: dt.datetime.fromtimestamp(r["ts"], dt.timezone.utc).strftime("%Y-%m-%d")
inn = [r for r in rows if r["dir"] == "in" and r["counterparty"] not in EVM and r["amount"] >= 0.01]
out = [r for r in rows if r["dir"] == "out" and r["counterparty"] not in EVM and r["amount"] >= 0.01]
# x402 micropayments can be fractions of a cent, so they skip the dust floor
x402 = [r for r in rows if r["dir"] == "in" and r["selector"] in AUTH and r["counterparty"] not in EVM and r["amount"] > 0]
last = max(r["ts"] for r in rows)
recent = [r for r in x402 if r["ts"] > last - 30 * 86400]

monthly = defaultdict(lambda: {"x402_usd": 0.0, "transfer_usd": 0.0, "x402_payments": 0})
for r in x402:
    m = monthly[day(r)[:7] + "-01"]
    m["x402_usd"] += r["amount"]; m["x402_payments"] += 1
for r in inn:
    if r["selector"] not in AUTH:
        monthly[day(r)[:7] + "-01"]["transfer_usd"] += r["amount"]

payers = defaultdict(lambda: {"volume_usd": 0.0, "payments": 0, "first": "9999", "last": "0000"})
for r in x402:
    p = payers[r["counterparty"]]
    p["volume_usd"] += r["amount"]; p["payments"] += 1
    p["first"] = min(p["first"], day(r)); p["last"] = max(p["last"], day(r))

dest = defaultdict(lambda: {"volume_usd": 0.0, "transfers": 0})
for r in out:
    dest[r["counterparty"]]["volume_usd"] += r["amount"]; dest[r["counterparty"]]["transfers"] += 1

total = sum(r["amount"] for r in x402)
out_json = {
    "as_of": dt.datetime.fromtimestamp(last, dt.timezone.utc).strftime("%Y-%m-%d"),
    "x402": {"volume_usd": total, "payments": len(x402), "payers": len(payers), "submitters": len({r["tx_from"] for r in x402}),
             "first": day(min(x402, key=lambda r: r["ts"])) if x402 else None, "avg_usd": total / len(x402) if x402 else 0},
    "x402_30d": {"volume_usd": sum(r["amount"] for r in recent), "payments": len(recent), "payers": len({r["counterparty"] for r in recent})},
    "other_in_usd": sum(r["amount"] for r in inn if r["selector"] not in AUTH),
    "monthly": sorted(({"month": k, **v} for k, v in monthly.items() if k >= "2025-01-01"), key=lambda x: x["month"]),
    "top_payers": sorted(({"payer": k, "share": v["volume_usd"] / total, **v} for k, v in payers.items()), key=lambda x: -x["volume_usd"])[:10],
    "outflows": {"volume_usd": sum(r["amount"] for r in out), "transfers": len(out)},
    "top_destinations": sorted(({"address": k, **v} for k, v in dest.items()), key=lambda x: -x["volume_usd"])[:8],
}
(ROOT / "src" / "data" / "x402.json").write_text(json.dumps(out_json, indent=1))
print(json.dumps({k: out_json[k] for k in ("x402", "x402_30d", "other_in_usd", "outflows")}, indent=1))
print("top payer share", round(out_json["top_payers"][0]["share"], 3) if x402 else None)
