"""Pull every stablecoin transfer into Laso's deposit addresses, straight from chain sources.

Writes one JSONL per chain to data/raw/{chain}.jsonl, one row per transfer:
  {chain, address, token, amount, sender, tx, block, ts}
Transfers between Laso's own addresses are dropped, as are amounts under $0.01.

Incremental: if data/raw/{chain}.jsonl exists, each address (and token) is only re-fetched from the
last block (Solana: last timestamp) already on file; rows from that point on are replaced, older rows kept.
Delete a chain's file to force a full pull.

Sources:
  ethereum, arbitrum, optimism  Blockscout API (BLOCKSCOUT_KEY)
  base, polygon, bnb            Alchemy alchemy_getAssetTransfers (RPC_URL; networks enabled on the app)
                                (logs() is a fallback over Infura eth_getLogs, 10k-block windows)
  solana                        Helius parsed-transactions API, per token account (HELIUS_KEY)

Usage: python scripts/pull_deposits.py ethereum arbitrum optimism base solana
"""
import json, os, sys, time, pathlib, threading, datetime as dt
from concurrent.futures import ThreadPoolExecutor
import urllib.request

from addresses import EVM, SOLANA, TOKENS, TRANSFER

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"

# keys live in the project's own .env (gitignored)
for line in (ROOT / ".env").read_text().splitlines() if (ROOT / ".env").exists() else []:
    k, _, v = line.partition("=")
    if k and not k.startswith("#"):
        os.environ.setdefault(k.strip(), v.strip())
RAW.mkdir(parents=True, exist_ok=True)


def post(url, body, tries=8):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, json.dumps(body).encode(), {"content-type": "application/json"})
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:  # 429s and timeouts: back off and retry
            if i == tries - 1:
                raise
            time.sleep(2 ** i)


def get(url, tries=8):
    for i in range(tries):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"user-agent": "laso-dashboard"}), timeout=60))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 ** i)


def load(chain):
    f = RAW / f"{chain}.jsonl"
    return [json.loads(l) for l in f.open()] if f.exists() else []


def resume(old, match, field="block"):
    """Split rows already on file for one address/token: the point to re-fetch from, and the rows to keep."""
    start = max((r[field] for r in old if match(r)), default=0)
    return start, [r for r in old if not (match(r) and r[field] >= start)]


def write(chain, rows):
    rows = [r for r in rows if r["amount"] >= 0.01]
    rows.sort(key=lambda r: (r["ts"], r["tx"]))
    with open(RAW / f"{chain}.jsonl", "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    print(f"{chain}: {len(rows):,} deposits, ${sum(r['amount'] for r in rows):,.0f}", flush=True)


# ---------- Blockscout (ethereum, arbitrum, optimism) ----------
BS_CHAIN = {"ethereum": 1, "arbitrum": 42161, "optimism": 10}


def blockscout(chain):
    key = os.environ["BLOCKSCOUT_KEY"]
    base = f"https://api.blockscout.com/{BS_CHAIN[chain]}/api"
    seen, rows, old = set(), [], load(chain)
    for addr in EVM:
        for token, (sym, dec) in TOKENS[chain].items():
            start, old = resume(old, lambda r: r["address"] == addr and r["token"] == sym)
            while True:
                got = 0
                for page in range(1, 11):  # page * offset must stay <= 10,000
                    d = get(f"{base}?module=account&action=tokentx&address={addr}&contractaddress={token}"
                            f"&startblock={start}&sort=asc&page={page}&offset=1000&apikey={key}")
                    res = d.get("result") or []
                    if not isinstance(res, list):
                        res = []
                    for t in res:
                        k = (t["hash"], t["from"], t["to"], t["value"], t["contractAddress"])
                        if k in seen:
                            continue
                        seen.add(k)
                        if t["to"].lower() != addr or t["from"].lower() in EVM:
                            continue
                        rows.append({"chain": chain, "address": addr, "token": sym, "amount": int(t["value"]) / 10 ** dec,
                                     "sender": t["from"].lower(), "tx": t["hash"], "block": int(t["blockNumber"]), "ts": int(t["timeStamp"])})
                    got += len(res)
                    last = int(res[-1]["blockNumber"]) if res else start
                    time.sleep(0.2)
                    if len(res) < 1000:
                        break
                if got < 10_000:
                    break
                start = last  # restart the window at the last block seen; duplicates are skipped
            print(f"  {chain} {addr[:8]} {sym}: {len(rows):,} new so far", flush=True)
    write(chain, old + rows)


# ---------- eth_getLogs (base, polygon, bnb) ----------
START = {"base": 11_500_000, "polygon": 42_000_000, "bnb": 29_000_000}  # before each chain's first Laso deposit
STEP = 10_000
BASE_GENESIS = 1686789347  # Base blocks are exactly 2s apart


def logs(chain):
    url = os.environ["INFURA_URL"].replace("mainnet.infura.io", {"base": "base-mainnet", "polygon": "polygon-mainnet", "bnb": "bsc-mainnet"}[chain] + ".infura.io")
    head = int(post(url, {"jsonrpc": "2.0", "id": 1, "method": "eth_blockNumber", "params": []})["result"], 16)
    to_topics = ["0x" + "0" * 24 + a[2:] for a in EVM]
    tokens = TOKENS[chain]
    windows = list(range(START[chain], head + 1, STEP))
    out, done, lock = [], [0], threading.Lock()

    def one(lo):
        hi = min(lo + STEP - 1, head)
        r = post(url, {"jsonrpc": "2.0", "id": 1, "method": "eth_getLogs", "params": [{
            "fromBlock": hex(lo), "toBlock": hex(hi), "address": list(tokens), "topics": [TRANSFER, None, to_topics]}]})
        if "error" in r:
            raise RuntimeError(f"{chain} {lo}: {r['error']}")
        with lock:
            out.extend(r["result"])
            done[0] += 1
            if done[0] % 200 == 0:
                print(f"  {chain}: {done[0]}/{len(windows)} windows, {len(out):,} logs", flush=True)

    with ThreadPoolExecutor(3) as ex:
        list(ex.map(one, windows))

    # timestamps: exact for Base, from block headers elsewhere
    blocks = sorted({int(l["blockNumber"], 16) for l in out})
    ts = {}
    if chain == "base":
        ts = {b: BASE_GENESIS + 2 * b for b in blocks}
    else:
        def stamp(b):
            ts[b] = int(post(url, {"jsonrpc": "2.0", "id": 1, "method": "eth_getBlockByNumber", "params": [hex(b), False]})["result"]["timestamp"], 16)
        with ThreadPoolExecutor(3) as ex:
            list(ex.map(stamp, blocks))

    rows = []
    for l in out:
        sender, to = "0x" + l["topics"][1][-40:], "0x" + l["topics"][2][-40:]
        if sender in EVM:
            continue
        sym, dec = tokens[l["address"].lower()]
        b = int(l["blockNumber"], 16)
        rows.append({"chain": chain, "address": to, "token": sym, "amount": int(l["data"], 16) / 10 ** dec,
                     "sender": sender, "tx": l["transactionHash"], "block": b, "ts": ts[b]})
    write(chain, rows)


# ---------- Alchemy transfers API (base, polygon, bnb) ----------
ALCHEMY_NET = {"base": "base-mainnet", "polygon": "polygon-mainnet", "bnb": "bnb-mainnet"}


def alchemy(chain):
    url = os.environ["RPC_URL"].replace("eth-mainnet", ALCHEMY_NET[chain])
    tokens = TOKENS[chain]
    rows, old = [], load(chain)
    for addr in EVM:
        start, old = resume(old, lambda r: r["address"] == addr)
        key = None
        while True:
            p = {"fromBlock": hex(start), "toAddress": addr, "category": ["erc20"], "contractAddresses": list(tokens),
                 "withMetadata": True, "excludeZeroValue": True, "maxCount": "0x3e8", **({"pageKey": key} if key else {})}
            r = post(url, {"jsonrpc": "2.0", "id": 1, "method": "alchemy_getAssetTransfers", "params": [p]})
            if "error" in r:
                raise RuntimeError(f"{chain}: {r['error']}")
            for t in r["result"]["transfers"]:
                sender = t["from"].lower()
                if sender in EVM:
                    continue
                sym, dec = tokens[t["rawContract"]["address"].lower()]
                ts = int(dt.datetime.fromisoformat(t["metadata"]["blockTimestamp"].replace("Z", "+00:00")).timestamp())
                rows.append({"chain": chain, "address": addr, "token": sym, "amount": int(t["rawContract"]["value"], 16) / 10 ** dec,
                             "sender": sender, "tx": t["hash"], "block": int(t["blockNum"], 16), "ts": ts})
            key = r["result"].get("pageKey")
            if not key:
                break
        print(f"  {chain} {addr[:8]}: {len(rows):,} new so far", flush=True)
    write(chain, old + rows)


# ---------- Solana (Helius parsed-transactions API, per token account) ----------
SOL_RPC = os.environ.get("RPC_URL", "").replace("eth-mainnet", "solana-mainnet") or "https://api.mainnet-beta.solana.com"


def solana(_chain="solana"):
    key = os.environ["HELIUS_KEY"]
    rows, old, since_by = [], load("solana"), {}
    for owner in SOLANA:
        accts = post(SOL_RPC, {"jsonrpc": "2.0", "id": 1, "method": "getTokenAccountsByOwner",
                               "params": [owner, {"programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}, {"encoding": "jsonParsed"}]})["result"]["value"]
        for a in accts:
            mint = a["account"]["data"]["parsed"]["info"]["mint"]
            if mint not in TOKENS["solana"]:
                continue
            sym, _ = TOKENS["solana"][mint]
            if (owner, sym) not in since_by:  # an owner can hold more than one account per mint; split once
                since_by[owner, sym], old = resume(old, lambda r: r["address"] == owner and r["token"] == sym, "ts")
            since = since_by[owner, sym]
            before, n = None, 0
            while True:
                page = get(f"https://api.helius.xyz/v0/addresses/{a['pubkey']}/transactions?api-key={key}&limit=100" + (f"&before={before}" if before else ""))
                if not page:
                    break
                for tx in page:
                    if tx.get("transactionError") or tx["timestamp"] < since:
                        continue
                    for t in tx.get("tokenTransfers") or []:
                        if t["mint"] != mint or t["toUserAccount"] != owner or t["fromUserAccount"] in SOLANA:
                            continue
                        rows.append({"chain": "solana", "address": owner, "token": sym, "amount": float(t["tokenAmount"]),
                                     "sender": t["fromUserAccount"], "tx": tx["signature"], "block": tx["slot"], "ts": tx["timestamp"], "fee_payer": tx.get("feePayer")})
                n += len(page)
                before = page[-1]["signature"]
                if page[-1]["timestamp"] < since:  # pages run newest first; we're past what's on file
                    break
            print(f"  solana {owner[:6]} {sym}: {n:,} transactions read, {len(rows):,} new deposits so far", flush=True)
    write("solana", old + rows)


if __name__ == "__main__":
    for chain in sys.argv[1:]:
        {"ethereum": blockscout, "arbitrum": blockscout, "optimism": blockscout,
         "base": alchemy, "polygon": alchemy, "bnb": alchemy, "solana": solana}[chain](chain)
