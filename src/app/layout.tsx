import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Cost of the Gap",
  description:
    "How climate risk becomes human and economic loss across the Pacific — Pacific Dataviz Challenge 2026.",
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