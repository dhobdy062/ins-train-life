"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DEFAULT_BILLING_SELECTION } from "@/lib/billing";

const policyOptions = [
  "Term Life",
  "Whole Life",
  "Universal Life",
  "Indexed Universal Life (IUL)",
];

export default function LeadForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form.");
      }

      setStatus("Check your email for the verification link to unlock the demo.");
      form.reset();
    } catch {
      setStatus("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass panel">
      <div className="demo-logo-wrap">
        <Image className="demo-logo" src="/nosugar.svg" alt="Cream No Sugar logo" width={220} height={220} priority />
      </div>
      <div className="tag">Try it for yourself</div>
      <h3>No credit card needed to try a call. Sign up and get sent a verification link.</h3>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          Full name
          <input name="name" placeholder="Jordan Blake" required />
        </label>
        <label className="field">
          Agency name
          <input name="agency" placeholder="North Ridge Agency" required />
        </label>
        <label className="field">
          Work email
          <input name="email" type="email" placeholder="jordan@agency.com" required />
        </label>
        <label className="field">
          Life policy focus
          <select name="policyType" required defaultValue="">
            <option value="" disabled>
              Select a policy type
            </option>
            {policyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send verification link"}
        </button>
      </form>
      <div className="hero-actions">
        <Link
          className="button secondary"
          href={`/checkout/start?plan=${DEFAULT_BILLING_SELECTION.planId}&interval=${DEFAULT_BILLING_SELECTION.interval}`}
        >
          Start paid training
        </Link>
      </div>
      {status ? <p className="disclaimer">{status}</p> : null}
      <p className="disclaimer disclaimer-highlight">
        Verification email unlocks the demo. Paid plans unlock full call library, scoring, and team analytics.
      </p>
    </div>
  );
}
