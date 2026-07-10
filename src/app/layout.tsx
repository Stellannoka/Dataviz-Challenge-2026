import type { Metadata } from "next";
import "@fontsource/libre-baskerville/400.css";
import "@fontsource/libre-baskerville/700.css";
import "@fontsource/libre-baskerville/400-italic.css";
import "@fontsource-variable/source-sans-3";
import "./globals.css";

const description =
  "The persistent gap between climate vulnerability and readiness across the Pacific Island Countries, and its human cost. Pacific Dataviz Challenge 2026.";

export const metadata: Metadata = {
  metadataBase: new URL("https://stellannoka.github.io"),
  title: "The Cost of the Gap",
  description,
  openGraph: {
    title: "The Cost of the Gap",
    description,
    url: "/Dataviz-Challenge-2026/",
    siteName: "The Cost of the Gap",
    type: "article",
    images: [
      {
        url: "/Dataviz-Challenge-2026/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Cost of the Gap: two decades of climate vulnerability and readiness data from the Pacific Island Countries",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Cost of the Gap",
    description,
    images: ["/Dataviz-Challenge-2026/og-image.png"],
  },
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
