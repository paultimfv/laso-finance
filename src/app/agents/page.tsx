import { stats, trailing, x402, onchain, LASO_BASE } from "@/lib/laso";
import { Counter, Counters, Card, Panel, Section, Note, PageHeader, StackedBars, Table } from "@/components/charts";
import { fmtUsd, fmtPct } from "@/lib/fmt";

export const revalidate = 3600;

export default async function AgentsPage() {
  const { days } = await stats();
  const ledger30 = trailing(days, 30).volume;
  const x = x402.x402, r = x402.x402_30d;
  const months = x402.monthly.filter((m) => m.month >= "2026-02-01");
  const sw = onchain.solanaSweeps;

  return (
    <main className="mx-auto max-w-6xl space-y-14 px-4 pb-10 pt-12">
      <PageHeader title="Agents" asOf={x402.as_of}>
        AI agents pay Laso over x402: the agent signs a USDC transfer authorization and a facilitator submits it onchain and pays the gas.
        On Base, those payments can be counted exactly. On Solana, agent deposits are mixed with people&apos;s, so they get an upper bound.
      </PageHeader>

      <Section title="x402 payments on Base" lede="A payment counts as x402 when the USDC moved through transferWithAuthorization, the signed-transfer call x402 uses. Plain transfers into the same address are people paying from their own wallets.">
        <Counters cols="md:grid-cols-3 lg:grid-cols-6">
          <Counter label="x402 volume, all time" value={fmtUsd(x.volume_usd)} sub={`since ${x.first}`} />
          <Counter label="x402 payments" value={x.payments.toLocaleString()} sub={`$${x.avg_usd.toFixed(2)} average`} />
          <Counter label="Payers" value={x.payers.toLocaleString()} sub={`submitted by ${x.submitters} facilitator wallets`} />
          <Counter label="x402 volume, 30 days" value={fmtUsd(r.volume_usd)} sub={`${r.payments} payments`} />
          <Counter label="Payers, 30 days" value={r.payers.toLocaleString()} />
          <Counter label="Share of Laso volume" value={fmtPct(r.volume_usd / ledger30)} sub={`of ${fmtUsd(ledger30)} in 30 days`} />
        </Counters>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="x402 volume by month" sub="USDC, latest month partial"><StackedBars data={months} x="month" ys={["x402_usd"]} /></Card>
          <Card title="x402 payments by month" sub="count, latest month partial"><StackedBars data={months} x="month" ys={["x402_payments"]} fmt="int" /></Card>
          <Card wide title="Everything paid into the address" sub="USDC by month: x402 against plain transfers, excluding Laso's own wallets">
            <StackedBars data={months} x="month" ys={["x402_usd", "transfer_usd"]} />
          </Card>
        </div>
      </Section>

      <Section title="Who pays" lede="The wallets that signed x402 payments to Laso, by all-time volume. One agent operator can run several wallets.">
        <Panel title="Top x402 payers" sub="Base, all time">
          <Table rows={x402.top_payers} cols={[
            { key: "payer", title: "Wallet", fmt: "addr" }, { key: "volume_usd", title: "Volume", fmt: "usd" }, { key: "share", title: "Share", fmt: "pct" },
            { key: "payments", title: "Payments", fmt: "int" }, { key: "first", title: "First" }, { key: "last", title: "Last" },
          ]} />
        </Panel>
      </Section>

      <Section title="Where it goes" lede="Money leaving the address: Laso paying card issuers and payout partners, or moving funds between its own wallets on other chains. The destinations are unlabeled.">
        <Counters cols="md:grid-cols-2">
          <Counter label="Sent out, all time" value={fmtUsd(x402.outflows.volume_usd)} sub={`${x402.outflows.transfers.toLocaleString()} transfers`} />
          <Counter label="Largest destination" value={fmtPct(x402.top_destinations[0].volume_usd / x402.outflows.volume_usd)} sub="of all USDC sent out" />
        </Counters>
        <Panel title="Top destinations" sub="USDC out of the address, all time">
          <Table rows={x402.top_destinations} cols={[
            { key: "address", title: "Address", fmt: "addr" }, { key: "volume_usd", title: "Volume", fmt: "usd" }, { key: "transfers", title: "Transfers", fmt: "int" },
          ]} />
        </Panel>
        <Note>
          Address <code>{LASO_BASE.slice(0, 6)}…{LASO_BASE.slice(-4)}</code> on Base, pulled from Alchemy. Solana is covered in the next section. Laso&apos;s docs name Coinbase as the facilitator; the transactions were submitted by {x.submitters} different wallets.
        </Note>
      </Section>
      <Section title="Solana deposit addresses" lede="On Solana, Laso gives payers their own deposit address and sweeps the money into its main wallet, paying the fee itself. Laso says agent deposits arrive this way, but so do people's, and the chain data can't tell them apart. Treat this as an upper bound on Solana agent volume, not a measure of it.">
        <Counters cols="md:grid-cols-4">
          <Counter label="Swept in, 30 days" value={fmtUsd(sw.volume_30d)} sub={`${sw.deposits_30d.toLocaleString()} sweeps`} />
          <Counter label="Deposit addresses, 30 days" value={sw.addresses_30d.toLocaleString()} sub="one per payer" />
          <Counter label="Share of Laso volume" value={fmtPct(sw.volume_30d / ledger30)} sub="30 days, upper bound for agents" />
          <Counter label="Swept in, all time" value={fmtUsd(sw.volume_usd)} sub={`${sw.addresses.toLocaleString()} deposit addresses`} />
        </Counters>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Swept in by month" sub="USD, latest month partial"><StackedBars data={sw.monthly} x="month" ys={["volume_usd"]} /></Card>
          <Card title="Sweeps by month" sub="count, latest month partial"><StackedBars data={sw.monthly} x="month" ys={["deposits"]} fmt="int" /></Card>
        </div>
        <Note>
          In a sample of 20 of these addresses, most were funded from the payer&apos;s own wallet, and only a few by a third party paying the fee, which is how a
          facilitator-submitted x402 payment would look. The 30-day total is close to the $280.7K that public x402 trackers attribute to Laso.
        </Note>
      </Section>

    </main>
  );
}
