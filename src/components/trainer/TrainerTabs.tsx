"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./TrainerTabs.module.css";

const TABS = [
  { href: "/dashboard/trainer/overview", label: "Overview" },
  { href: "/dashboard/trainer/trainees", label: "Trainees" },
  { href: "/dashboard/trainer/session-builder", label: "Session Builder" },
  { href: "/dashboard/trainer/objections", label: "Objection Library" },
  { href: "/dashboard/trainer/scoring", label: "Scoring" },
  { href: "/dashboard/trainer/help", label: "Help" },
];

export default function TrainerTabs() {
  const pathname = usePathname();

  return (
    <div className={styles.wrap} aria-label="Trainer dashboard sections">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
