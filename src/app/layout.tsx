import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mazra — Hospital data simulation",
  description:
    "Standalone simulation engine for realistic hospital operational data (TAT, revenue, equipment, cold chain, QC).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
