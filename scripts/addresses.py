"""Laso deposit addresses and the stablecoins counted as deposits, per chain.

Address list and product labels: Laso's own published list. Stablecoin contracts: issuer docs.
"""

EVM = {
    "0x3291e96b3bff7ed56e3ca8364273c5b4654b2b37": "Main EVM deposit (reloadable + account balance)",
    "0xa2adaa6adfce3987cfa04db4d876d9cf7fab00fd": "Intl reloadable (EVM)",
    "0xf0e0d6c3538e3cc109730c9decae25c41ebdbbd0": "Account balance (ETH + BNB)",
    "0xf2ce71121c32730f7fac85ea7c8bc279a1320030": "Account balance (Base)",
    "0x76630b66b0cf7858186dc7031ad1e7e29a13168c": "Account balance (Arbitrum) + BTC swap treasury",
    "0x8cbc98d51a8fcd83fe366acf96c55ad22e8bb95c": "Account balance (Polygon)",
    "0x609299443b6cb7d0a9b878baeeaeb8a4ea2e64aa": "Account balance (Optimism)",
}

SOLANA = {
    "3MZVk97x9SeRxbYpc3jhzRfU2fyA3emYutnqfn9kNfYX": "Account balance (Solana) + agent sweeps",
    "8P9JiLTZSUZEhaBNPabrqVjKC9brZ87FJhhxNdVNabSq": "USA reloadable (Solana)",
    "Cdhj6FBJjaAbQZXP4RDaq7hCBZdcbundLtq1QiH4H9zc": "Intl reloadable (Solana)",
}

STELLAR = {
    "GDG7OK47JXPD7QKVBGOWQAVMX2HFM2YZQS2VDM47W3YKMGHE4ZTJJANS": "USA reloadable (Stellar)",
    "GCJQRJH3MPMSHNMHKUL5MVAT3OUMX2KCTAQ7AWRQGI2WJH5ZXNRLAY2O": "Intl reloadable (Stellar)",
    "GC6OYT32EDEFFDQETZAIS2TJRCC6RX6QLEOJ54GR36734BDQP5OVTH7V": "Account balance (Stellar)",
    "GAISPVIQDZED6LPHW22G6ZVWWX54FC5IVYOG2YZ3WODMCCKWYQW7TWW2": "Presale (Stellar)",
}

# contract -> (symbol, decimals)
TOKENS = {
    "ethereum": {
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": ("USDC", 6),
        "0xdac17f958d2ee523a2206206994597c13d831ec7": ("USDT", 6),
        "0x6b175474e89094c44da98b954eedeac495271d0f": ("DAI", 18),
    },
    "arbitrum": {
        "0xaf88d065e77c8cc2239327c5edb3a432268e5831": ("USDC", 6),
        "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": ("USDC.e", 6),
        "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": ("USDT", 6),
        "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1": ("DAI", 18),
    },
    "optimism": {
        "0x0b2c639c533813f4aa9d7837caf62653d097ff85": ("USDC", 6),
        "0x7f5c764cbc14f9669b88837ca1490cca17c31607": ("USDC.e", 6),
        "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58": ("USDT", 6),
        "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1": ("DAI", 18),
    },
    "base": {
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": ("USDC", 6),
        "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": ("USDbC", 6),
        "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2": ("USDT", 6),
        "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": ("DAI", 18),
    },
    "polygon": {
        "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": ("USDC", 6),
        "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": ("USDC.e", 6),
        "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": ("USDT", 6),
        "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": ("DAI", 18),
    },
    "bnb": {
        "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": ("USDC", 18),
        "0x55d398326f99059ff775485246999027b3197955": ("USDT", 18),
        "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3": ("DAI", 18),
    },
    "solana": {
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": ("USDC", 6),
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": ("USDT", 6),
    },
}

TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
