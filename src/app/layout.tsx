import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Promos Ink Customer Portal",
  description:
    "Live inventory, instant quotes, and billing tools for Promos Ink customers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-slate-100 text-slate-900 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
