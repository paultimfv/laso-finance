/* Exhibit specs. Coordinates are in a 760-wide viewBox. Every label is sourced from Laso's docs or the data. */
export type Kind = "rh" | "maple" | "morpho" | "syrup" | "infra" | "warn" | "plain";
export type ExNode = { id: string; x: number; y: number; w: number; h: number; t: string; sub?: string[]; kind?: Kind };
export type ExEdge = { from?: string; to?: string; pts?: number[][]; label?: string; lx?: number; ly?: number; anchor?: string;
  dash?: boolean; ym?: number; dx1?: number; dx2?: number; dy1?: number; dy2?: number; k0?: string; k1?: string };
export type ExhibitSpec = { nodes: ExNode[]; edges: ExEdge[]; groups?: { x: number; y: number; w: number; h: number; label: string }[];
  text?: { x: number; y: number; t: string; anchor?: string }[]; lines?: number[][] };

export const SPECS: Record<string, ExhibitSpec> = {
/* 1. How money moves through Laso */
d1: {
  nodes: [
    { id: "p", x: 40, y: 14, w: 300, h: 52, t: "People", sub: ["Sign in with a self-custodial wallet"], kind: "infra" },
    { id: "a", x: 420, y: 14, w: 300, h: 52, t: "AI agents", sub: ["x402 HTTP API or MCP tools"], kind: "infra" },
    { id: "f", x: 420, y: 104, w: 300, h: 52, t: "Coinbase facilitator", sub: ["Submits the signed transfer, pays gas"], kind: "plain" },
    { id: "w", x: 160, y: 194, w: 440, h: 62, t: "Deposit wallets (Laso)", sub: ["14 addresses on 8 chains · USDC, USDT, DAI", "No Laso smart contracts: wallets + stablecoins"], kind: "maple" },
    { id: "c", x: 14, y: 314, w: 230, h: 62, t: "Card issuers", sub: ["Prepaid Visa: U.S., Canada, intl", "Reloadable card: USDC on Base"], kind: "infra" },
    { id: "g", x: 265, y: 314, w: 230, h: 62, t: "Gift card merchants", sub: ["Amazon, Uber, DoorDash", "and thousands more"], kind: "infra" },
    { id: "b", x: 516, y: 314, w: 230, h: 62, t: "Bank · Venmo · PayPal", sub: ["Push-to-card, ACH, payouts", "Identity check required"], kind: "infra" },
    { id: "t", x: 420, y: 444, w: 280, h: 62, t: "LASO treasury (MetaDAO)", sub: ["Solana · receives each day's revenue", "since Jul 7, 2026"], kind: "maple" },
    { id: "o", x: 60, y: 444, w: 260, h: 62, t: "Team allowance", sub: ["$50k a month from the treasury", "salaries + operating costs"], kind: "plain" },
  ],
  edges: [
    { from: "p", to: "w", dx2: -90, label: "sends USDC", lx: 110, ly: 160 },
    { from: "a", to: "f", label: "signs EIP-3009 transfer" },
    { from: "f", to: "w", dx2: 140, label: "USDC lands" },
    { from: "w", to: "c", ym: 290 }, { from: "w", to: "g", ym: 290, label: "face value goes out", lx: 390, ly: 284 }, { from: "w", to: "b", ym: 290 },
    { pts: [[600, 214], [748, 214], [748, 475], [700, 475]], dash: true, label: "fees + issuer discount = revenue", lx: 740, ly: 420, anchor: "end" },
    { from: "t", to: "o", dash: true, label: "monthly" },
  ],
},
};
