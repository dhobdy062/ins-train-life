import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Cream No Sugar | Caffeinated Training To Make Closers",
  description:
    "Prospect simulation for life insurance agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${sora.variable} ${plexMono.variable}`}>
          <SiteNav />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
