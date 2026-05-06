import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRA Nexus — 次世代静的PRA解析プラットフォーム",
  description: "原子力・インフラ向けWebベース確率論的リスク評価（PRA）ツール。Fault Tree / Event Tree解析、BDD定量化、重要度指標を統合。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
