import { pricing } from "@/lib/laso";
import { Panel, Section, Note, PageHeader, Table } from "@/components/charts";
import { Exhibit } from "@/components/exhibit";

export const revalidate = 3600;

const NAME: Record<string, string> = {
  usa_prepaid_card: "U.S. prepaid card", international_prepaid_card: "International prepaid card", gift_card: "Gift cards",
  push_to_card: "Push to debit card", venmo_paypal_payment: "Venmo / PayPal payout", bank_payment: "Bank payment (ACH)", card_balance_funding: "Reloadable card top-up",
};
/* identity requirements per Laso's agent docs (llms-full.txt) */
const ID: Record<string, string> = {
  usa_prepaid_card: "none", international_prepaid_card: "none", gift_card: "none", push_to_card: "—",
  venmo_paypal_payment: "required", bank_payment: "required", card_balance_funding: "required (reloadable card)",
};

/* Laso's own worked example (about.laso.finance, "Volume, Revenue") */
const EXAMPLE = [
  { line: "User pays", amount: "$102.80", note: "$100 card + 2.8% fee" },
  { line: "Laso pays the issuer", amount: "$98.00", note: "2% issuer discount" },
  { line: "Revenue", amount: "$4.80", note: "4.8% blended take rate" },
  { line: "COGS", amount: "$0.19", note: "swap fees, gas, bank transfer fees" },
  { line: "Gross profit", amount: "$4.61", note: "96% gross margin" },
];

export default async function Page() {
  const prices = await pricing();
  const rows = prices.map((p) => ({
    product: NAME[p.product] ?? p.product, route: p.route,
    range: `${p.min_amount.toLocaleString()}–${p.max_amount.toLocaleString()} ${p.amount_currencies?.join("/") ?? "(product currency)"}`,
    fee: p.fee_rate === 0 ? "0%" : `${(p.fee_rate * 100).toFixed(p.fee_rate < 0.01 ? 2 : 1)}%${p.min_fee ? `, min ${p.min_fee.toFixed(2)}` : ""}`,
    id: ID[p.product] ?? "—",
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 pb-10 pt-12">
      <PageHeader title="How it works">
        Stablecoins come in, Laso pays the card issuer or payout partner the face value, and the fee plus the issuer&apos;s discount is revenue. Fees below are live from Laso.
      </PageHeader>

      <Section title="Money flow">
        <Exhibit id="d1" n={1} title="How money moves through Laso" lede="Stablecoins in, card or fiat payout out; revenue is swept daily to the token treasury."
          source="docs.laso.finance, laso.finance/llms-full.txt, about.laso.finance, onchain deposits" />
      </Section>

      <Section title="Products and fees" lede="Live from Laso's pricing endpoint. Fees are added on top: the card or recipient gets the full amount.">
        <Panel title="Fee schedule" sub="laso.finance/get-pricing. Identity column from Laso's agent docs.">
          <Table rows={rows} cols={[
            { key: "product", title: "Product" }, { key: "route", title: "x402 route" }, { key: "range", title: "Order size" }, { key: "fee", title: "User fee" }, { key: "id", title: "Identity check" },
          ]} />
        </Panel>
        <Note>The user fee is only part of revenue: Laso also earns discounts or interchange share from issuers, which is why a 0% card still earns money.</Note>
      </Section>

      <Section title="Unit economics" lede="Laso's own example for a $100 card.">
        <Panel title="A $100 card" sub="about.laso.finance, Volume and Revenue page">
          <Table rows={EXAMPLE} cols={[{ key: "line", title: "" }, { key: "amount", title: "Amount" }, { key: "note", title: "" }]} />
        </Panel>
      </Section>
    </main>
  );
}
