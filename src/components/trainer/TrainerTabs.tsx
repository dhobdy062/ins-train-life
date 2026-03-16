"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./TrainerTabs.module.css";

const TABS = [
  { href: "/dashboard/trainer/overview", label: "Agent Management" },
  { href: "/dashboard/trainer/trainees", label: "Team Members" },
  { href: "/dashboard/trainer/session-builder", label: "Training Calls" },
  { href: "/dashboard/trainer/objections", label: "Objection Library" },
  { href: "/dashboard/trainer/scoring", label: "Scoring" },
  { href: "/dashboard/trainer/training-plans", label: "30/60/90 Plans" },
  { href: "/dashboard/trainer/faq", label: "FAQ" },
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
