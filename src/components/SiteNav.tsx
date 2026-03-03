"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignOutButton, UserButton } from "@clerk/nextjs";

export default function SiteNav() {
  const pathname = usePathname();
  const homeHref = pathname?.startsWith("/dashboard/trainer")
    ? "/dashboard/trainer"
    : pathname?.startsWith("/dashboard/trainee")
      ? "/dashboard/trainee"
      : "/";

  return (
    <header className="site-nav-wrap">
      <div className="site-nav-shell">
        <nav className="nav" aria-label="Primary">
          <Link className="brand brand-home" href={homeHref} aria-label="Back to home page">
            <Image className="brand-logo" src="/nosugar.svg" alt="Cream No Sugar logo" width={44} height={44} priority />
            <span className="brand-title">Cream No Sugar</span>
          </Link>
          <div className="hero-actions">
            <SignedOut>
              <Link className="button secondary" href="/sign-in">
                Sign in
              </Link>
              <Link className="button" href="/sign-up">
                Sign up
              </Link>
            </SignedOut>
            <SignedIn>
              <Link className="button secondary" href="/workspace/select-organization?redirect_url=%2Fdashboard%2Ftrainer">
                Open workspace
              </Link>
              <SignOutButton>
                <button className="button secondary" type="button">
                  Sign out
                </button>
              </SignOutButton>
              <UserButton />
            </SignedIn>
          </div>
        </nav>
      </div>
    </header>
  );
}
