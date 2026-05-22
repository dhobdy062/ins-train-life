"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getAllowedDifficultiesForProduct,
  getTrainingProductConfig,
  normalizeDifficultyForProduct,
  TRAINING_PRODUCT_OPTIONS,
  type TrainingProductType,
} from "@/lib/training-products";
import { type DifficultyLevel } from "@/lib/training-profile";

type SelfServeSessionSetupProps = {
  traineeName: string;
  availableProductTypes: TrainingProductType[];
  initialDifficulty: string;
  initialNumObjections: number;
};

type CreateSessionResponse = {
  ok?: boolean;
  error?: string;
  sessionKey?: string;
  selfSession?: boolean;
};

export default function SelfServeSessionSetup({
  traineeName,
  availableProductTypes,
  initialDifficulty,
  initialNumObjections,
}: SelfServeSessionSetupProps) {
  const safeProducts = useMemo(
    () => (availableProductTypes.length > 0 ? availableProductTypes : (["life"] as TrainingProductType[])),
    [availableProductTypes],
  );
  const initialProductType = safeProducts.includes("life") ? "life" : safeProducts[0];
  const [productType, setProductType] = useState<TrainingProductType>(initialProductType);
  const [difficulty, setDifficulty] = useState(() => normalizeDifficultyForProduct(initialProductType, initialDifficulty));
  const [numObjections, setNumObjections] = useState(Math.min(Math.max(initialNumObjections || 3, 1), 7));
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const productOptions = useMemo(
    () => TRAINING_PRODUCT_OPTIONS.filter((option) => safeProducts.includes(option.productType)),
    [safeProducts],
  );
  const difficultyOptions = getAllowedDifficultiesForProduct(productType);
  const productConfig = getTrainingProductConfig(productType);

  function handleProductChange(nextProductType: TrainingProductType) {
    setProductType(nextProductType);
    setDifficulty((current) => normalizeDifficultyForProduct(nextProductType, current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus("Creating your practice session...");

    try {
      const response = await fetch("/api/trainer/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "self",
          productType,
          difficulty,
          numObjections,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CreateSessionResponse;

      if (!response.ok || !payload.ok || !payload.sessionKey) {
        throw new Error(payload.error ?? "Unable to create your practice session.");
      }

      setStatus("Session ready. Opening the call starter...");
      const mode = payload.selfSession ? "&mode=trainer" : "";
      window.location.href = `/training/start?session=${encodeURIComponent(payload.sessionKey)}${mode}`;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create your practice session.");
      setSubmitting(false);
    }
  }

  return (
    <section className="glass panel">
      <div className="tag">First practice setup</div>
      <h3>Welcome, {traineeName}</h3>
      <p className="disclaimer">
        Choose the setup for this practice call. We will create the session and take you straight to the call starter.
      </p>

      <form className="form" onSubmit={handleSubmit}>
        <div className="split">
          <label className="field">
            Product
            <select
              value={productType}
              onChange={(event) => handleProductChange(event.target.value as TrainingProductType)}
              disabled={submitting}
            >
              {productOptions.map((option) => (
                <option key={option.productType} value={option.productType}>
                  {option.productLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Difficulty
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as DifficultyLevel)}
              disabled={submitting}
            >
              {difficultyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Objections
            <input
              type="number"
              min={1}
              max={7}
              value={numObjections}
              onChange={(event) => setNumObjections(Math.min(Math.max(Number(event.target.value || 3), 1), 7))}
              disabled={submitting}
            />
          </label>
        </div>

        <div className="hero-actions">
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create and start session"}
          </button>
          <Link className="button secondary" href="/dashboard/trainee">
            View dashboard
          </Link>
        </div>
      </form>

      <p className="disclaimer">
        Current scenario: {productConfig.productLabel}, {productConfig.scenarioLabel}.
      </p>
      {status ? <p className="disclaimer">{status}</p> : null}
    </section>
  );
}
