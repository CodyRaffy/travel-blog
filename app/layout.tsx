import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raffy's on the Road Blog",
  description: "Raffensperger Travel Blog",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
