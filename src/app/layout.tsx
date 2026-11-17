import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ruang Sosmed 2.0 — Admin Studio & LMS",
  description:
    "Modern minimalist SaaS Learning Management System for online social media, digital marketing, and creator classes.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-[#F8F9FB] text-[#121215] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
