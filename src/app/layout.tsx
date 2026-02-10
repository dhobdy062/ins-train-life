import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  title: "InsureTrain AI | Life Insurance Sales Simulator",
  description:
    "Simulated prospect training for life insurance agents. Run 2-minute practice calls and sharpen objection handling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = Boolean(publishableKey && /^pk_(test|live)_/.test(publishableKey));

  return (
    <html lang="en">
      {clerkEnabled ? (
        <ClerkProvider publishableKey={publishableKey}>
          <body className={`${sora.variable} ${plexMono.variable}`}>{children}</body>
        </ClerkProvider>
      ) : (
        <body className={`${sora.variable} ${plexMono.variable}`}>{children}</body>
      )}
    </html>
  );
}
