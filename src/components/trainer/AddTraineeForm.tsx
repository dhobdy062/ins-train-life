"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateTraineeApiResponse = {
  ok?: boolean;
  error?: string;
  details?: string;
  trainingUrl?: string;
  clerkUserId?: string;
};

export default function AddTraineeForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    difficultyLevel: "D2",
    numObjections: 3,
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setInviteUrl(null);

    try {
      const response = await fetch("/api/trainer/trainees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json().catch(() => ({}))) as CreateTraineeApiResponse;
      if (payload.trainingUrl) {
        setInviteUrl(payload.trainingUrl);
      }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.details ?? payload.error ?? "Unable to create trainee.");
      }

      setStatus(
        payload.clerkUserId
          ? "Trainee created in Clerk and onboarding email sent."
          : "Trainee created and onboarding email sent.",
      );
      setForm({
        name: "",
        email: "",
        difficultyLevel: "D2",
        numObjections: 3,
      });
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create trainee.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="split">
        <label className="field">
          Name
          <input
            required
            value={form.name}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
          />
        </label>

        <label className="field">
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
          />
        </label>

        <label className="field">
          Difficulty
          <select
            value={form.difficultyLevel}
            onChange={(event) => setForm((previous) => ({ ...previous, difficultyLevel: event.target.value }))}
          >
            <option value="D1">D1</option>
            <option value="D2">D2</option>
            <option value="D3">D3</option>
            <option value="D4">D4</option>
            <option value="D5">D5</option>
          </select>
        </label>

        <label className="field">
          Objections
          <input
            type="number"
            min={1}
            max={7}
            value={form.numObjections}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                numObjections: Number(event.target.value || 3),
              }))
            }
          />
        </label>
      </div>

      <div className="hero-actions">
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add trainee"}
        </button>
      </div>

      {status ? <p className="disclaimer">{status}</p> : null}
      {inviteUrl ? (
        <p className="disclaimer">
          Invite link: <a href={inviteUrl}>{inviteUrl}</a>
        </p>
      ) : null}
    </form>
  );
}
