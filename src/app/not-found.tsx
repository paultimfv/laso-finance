import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-6xl gap-3 px-4 py-24">
      <div className="font-mono text-[12px] text-muted">404</div>
      <h1 className="text-[34px] font-semibold tracking-[-0.025em]">No page at this address.</h1>
      <p className="text-[13px] text-ink-2">
        Go to <Link href="/" className="underline underline-offset-2 hover:text-ink">the business page</Link>.
      </p>
    </main>
  );
}
