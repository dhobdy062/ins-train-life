"use client";

import Image from "next/image";
import { useState } from "react";

const policyOptions = [
  "Term Life",
  "Whole Life",
  "Universal Life",
  "Indexed Universal Life (IUL)",
];

type LeadSubmissionResult = {
  status: string;
};

type SubmitLeadFormOptions = {
  fetchImpl?: typeof fetch;
  reset?: () => void;
};

export function LeadFormStatus({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="disclaimer" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  );
}

export async function submitLeadForm(formData: FormData, options: SubmitLeadFormOptions = {}): Promise<LeadSubmissionResult> {
  const { fetchImpl = fetch, reset = () => {} } = options;
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetchImpl("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to submit form.");
    }

    reset();
    return { status: "Check your email for the verification link to unlock the demo." };
  } catch {
    return { status: "Something went wrong. Please try again." };
  }
}

export default function LeadForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = await submitLeadForm(formData, {
      fetchImpl: fetch,
      reset: () => form.reset(),
    });

    setStatus(result.status);
    setLoading(false);
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
          <input name="email" type="email" placeholder="cream@support.retrospxt.com" required />
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
      <LeadFormStatus message={status} />
      <p className="disclaimer disclaimer-highlight">
        Verification email unlocks the demo. Paid plans unlock full call library, scoring, and team analytics.
      </p>
    </div>
  );
}
