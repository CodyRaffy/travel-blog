import type { Metadata } from "next";
import { Zilla_Slab, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "./site.css";

const display = Zilla_Slab({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Raffy's on the Road", template: "%s · Raffy's on the Road" },
  description: "Three and a half years of full-time RV travel across the United States, one stop at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
