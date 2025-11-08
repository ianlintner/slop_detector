import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slop Detector - Analyze Content Quality",
  description: "Analyze content for low-effort, repetitive, AI-generated, or spammy characteristics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
