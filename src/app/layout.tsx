import type { Metadata } from "next";
import "@fontsource/libre-baskerville/400.css";
import "@fontsource/libre-baskerville/700.css";
import "@fontsource/libre-baskerville/400-italic.css";
import "@fontsource-variable/source-sans-3";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Cost of the Gap",
  description:
    "The persistent gap between climate vulnerability and readiness across the Pacific Island Countries, and its human cost. Pacific Dataviz Challenge 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
