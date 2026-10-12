/* The business page's one loud object: Laso's product is a card, so the headline numbers are printed on one. */
const group = (n: number) => Math.round(n).toLocaleString("en-US");

export function LedgerCard({ total, volume30, revenue30, asOf }: { total: number; volume30: number; revenue30: number; asOf: string }) {
  const [y, m, d] = asOf.split("-");
  return (
    <figure className="card-in m-0 w-full max-w-[460px]" aria-label="Laso headline figures">
      <div className="laso-card relative aspect-[1.586] w-full overflow-hidden rounded-[18px] p-[6%] text-[#9aa3ae]">
        <div className="flex items-start justify-between">
          <span className="mark scale-[1.6] origin-top-left" aria-hidden />
        </div>

        <div className="absolute inset-x-[6%] top-[40%]">
          <div className="font-mono text-[10.5px] text-[#6c7684]">Volume through Laso, all time</div>
          <div className="emboss num mt-1 text-[clamp(26px,6.4vw,38px)] font-light tracking-[0.04em]">${group(total)}</div>
        </div>

        <dl className="absolute inset-x-[6%] bottom-[8%] grid grid-cols-3 gap-3 font-mono">
          <div>
            <dt className="text-[9.5px] text-[#6c7684]">30-day volume</dt>
            <dd className="emboss num mt-0.5 text-[13px]">${group(volume30)}</dd>
          </div>
          <div>
            <dt className="text-[9.5px] text-[#6c7684]">30-day revenue</dt>
            <dd className="emboss num mt-0.5 text-[13px]">${group(revenue30)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-[9.5px] text-[#6c7684]">Thru</dt>
            <dd className="emboss num mt-0.5 text-[13px]">{m}/{d}/{y.slice(2)}</dd>
          </div>
        </dl>
      </div>
    </figure>
  );
}
