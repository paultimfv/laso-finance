"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/", label: "Business" },
  { href: "/agents", label: "Agents" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/token", label: "LASO" },
];

function ThemeToggle() {
  const [light, setLight] = useState<boolean | null>(null);
  useEffect(() => setLight(document.documentElement.dataset.theme === "light"), []);
  const flip = () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setLight(next === "light");
  };
  return (
    <button onClick={flip} aria-label={light ? "Switch to dark mode" : "Switch to light mode"} title={light ? "Dark mode" : "Light mode"}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-line text-muted transition-colors hover:border-line-strong hover:text-ink">
      {light === null ? null : light ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      )}
    </button>
  );
}

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-page/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-3.5" aria-label="Laso research, home">
          <span className="mark" aria-hidden />
          <span className="font-mono text-[17px] font-light tracking-[0.02em] text-ink">laso</span>
          <span className="font-mono text-[11px] text-muted">/ research</span>
        </Link>
        <div className="flex min-w-0 gap-6 overflow-x-auto whitespace-nowrap text-[13px]">
          {nav.map((n) => {
            const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
                className={`-mb-px border-b py-4 transition-colors ${on ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink-2"}`}>
                {n.label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto"><ThemeToggle /></div>
      </div>
    </nav>
  );
}
