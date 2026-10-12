import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Nav from "@/components/nav";
import "./globals.css";

// one coding face for everything; JetBrains Mono's tall x-height keeps prose readable at small sizes
const code = JetBrains_Mono({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-code" });

export const metadata: Metadata = {
  title: "Laso Finance research",
  description: "Independent research on Laso Finance: volume, revenue, onchain deposits, agent payments and the LASO token",
};

// before paint: a saved choice (or ?theme=light|dark) wins; otherwise dark, Laso's own look
const themeScript = `try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={code.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="antialiased">
        <Nav />
        {children}
        <footer className="mx-auto mt-8 max-w-6xl border-t border-line px-4 py-8 text-[12px] leading-relaxed text-muted">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
            <p>Independent research by Paul Timofeev. Not affiliated with Laso Finance, and not investment advice.</p>
            <p className="text-[11px]">Laso stats API, chain data, Solana RPC, CoinGecko. Refreshed hourly.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
