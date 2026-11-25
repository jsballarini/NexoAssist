import type { Metadata } from "next";
import { Newsreader, Outfit, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit-family" });
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted-family",
  weight: ["400", "500", "600"],
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader-family",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Nexo Assist",
  description: "Service desk de TI — Nexo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${schibsted.variable} ${newsreader.variable}`}
    >
      <body className="font-outfit antialiased">
        {children}
      </body>
    </html>
  );
}
