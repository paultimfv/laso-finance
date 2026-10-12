"""Every USDC transfer into or out of Laso's main address on Base, with each inbound transaction's
sender and function call, so x402 payments (transferWithAuthorization submitted by a facilitator)
can be told apart from plain transfers.

Writes data/raw/x402_base.jsonl: {dir, counterparty, amount, tx, block, ts, tx_from, tx_to, selector}
Source: Alchemy (RPC_URL with Base enabled).
Incremental: re-fetches each direction from the last block on file; older rows are kept.
"""
import json, os, pathlib, datetime as dt
from concurrent.futures import ThreadPoolExecutor

from pull_deposits import post  # also loads the project .env

ROOT = pathlib.Path(__file__).resolve().parent.parent
LASO = "0x3291e96b3bff7ed56e3ca8364273c5b4654b2b37"
USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
URL = os.environ["RPC_URL"].replace("eth-mainnet", "base-mainnet")


def transfers(direction, start=0):
    out, key = [], None
    while True:
        p = {"fromBlock": hex(start), "category": ["erc20"], "contractAddresses": [USDC], "withMetadata": True,
             "excludeZeroValue": True, "maxCount": "0x3e8", ("toAddress" if direction == "in" else "fromAddress"): LASO,
             **({"pageKey": key} if key else {})}
        r = post(URL, {"jsonrpc": "2.0", "id": 1, "method": "alchemy_getAssetTransfers", "params": [p]})["result"]
        for t in r["transfers"]:
            ts = int(dt.datetime.fromisoformat(t["metadata"]["blockTimestamp"].replace("Z", "+00:00")).timestamp())
            out.append({"dir": direction, "counterparty": (t["from"] if direction == "in" else t["to"]).lower(),
                        "amount": int(t["rawContract"]["value"], 16) / 1e6, "tx": t["hash"], "block": int(t["blockNum"], 16), "ts": ts})
        key = r.get("pageKey")
        if not key:
            return out


def tx_meta(row):
    t = post(URL, {"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionByHash", "params": [row["tx"]]})["result"]
    row.update(tx_from=t["from"].lower(), tx_to=(t["to"] or "").lower(), selector=t["input"][:10])
    return row


if __name__ == "__main__":
    f = ROOT / "data" / "raw" / "x402_base.jsonl"
    old = [json.loads(l) for l in f.open()] if f.exists() else []
    new = []
    for d in ("in", "out"):
        start = max((r["block"] for r in old if r["dir"] == d), default=0)
        old = [r for r in old if not (r["dir"] == d and r["block"] >= start)]
        new += transfers(d, start)
    print(f"{len(new):,} new transfers; fetching transaction senders", flush=True)
    with ThreadPoolExecutor(4) as ex:
        rows = old + list(ex.map(tx_meta, new))
    rows.sort(key=lambda r: (r["ts"], r["tx"]))
    with open(f, "w") as out:
        for r in rows:
            out.write(json.dumps(r) + "\n")
    print(f"done: {sum(r['dir'] == 'in' for r in rows):,} in, {sum(r['dir'] == 'out' for r in rows):,} out")
