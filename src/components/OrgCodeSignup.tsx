"use client";

import { useState } from "react";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "confirmed"; organizationName: string; confirmationToken: string }
  | { status: "error"; message: string };

type OrgCodeSignupProps = {
  onConfirmed: (confirmationToken: string) => void;
};

export default function OrgCodeSignup({ onConfirmed }: OrgCodeSignupProps) {
  const [orgCode, setOrgCode] = useState("");
  const [state, setState] = useState<LookupState>({ status: "idle" });

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/signup/org-code/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgCode }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        organizationName?: string;
        confirmationToken?: string;
      };

      if (!response.ok || !payload.ok || !payload.organizationName || !payload.confirmationToken) {
        throw new Error(payload.error ?? "We could not confirm that organization ID.");
      }

      setState({
        status: "confirmed",
        organizationName: payload.organizationName,
        confirmationToken: payload.confirmationToken,
      });
      onConfirmed(payload.confirmationToken);
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "We could not confirm that organization ID.",
      });
      onConfirmed("");
    }
  }

  return (
    <form className="form" onSubmit={handleLookup}>
      <label className="field">
        Organization ID
        <input
          value={orgCode}
          onChange={(event) => {
            setOrgCode(event.target.value.slice(-6));
            setState({ status: "idle" });
            onConfirmed("");
          }}
          placeholder="Last 6 characters"
          autoComplete="off"
        />
      </label>
      <button className="button secondary" type="submit" disabled={state.status === "loading" || orgCode.trim().length !== 6}>
        {state.status === "loading" ? "Checking..." : "Confirm organization"}
      </button>
      {state.status === "confirmed" ? (
        <p className="disclaimer">Confirmed: {state.organizationName}. Create your account to join this organization.</p>
      ) : null}
      {state.status === "error" ? <p className="disclaimer">{state.message}</p> : null}
    </form>
  );
}
