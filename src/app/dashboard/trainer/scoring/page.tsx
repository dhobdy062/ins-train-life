"use client";

import { useMemo, useState } from "react";

type ScoreWeights = {
  rebuttalAccuracy: number;
  executionQuality: number;
  timing: number;
  prospectResponse: number;
};

const DEFAULT_WEIGHTS: ScoreWeights = {
  rebuttalAccuracy: 40,
  executionQuality: 30,
  timing: 15,
  prospectResponse: 15,
};

export default function ScoringPage() {
  const [weights, setWeights] = useState<ScoreWeights>(DEFAULT_WEIGHTS);
  const [status, setStatus] = useState<string | null>(null);

  const total = useMemo(
    () => weights.rebuttalAccuracy + weights.executionQuality + weights.timing + weights.prospectResponse,
    [weights],
  );

  function setWeight<K extends keyof ScoreWeights>(key: K, value: number) {
    setWeights((previous) => ({ ...previous, [key]: value }));
  }

  function onSave() {
    if (total !== 100) {
      setStatus("Total must equal 100% before saving.");
      return;
    }
    setStatus("Scoring settings saved for this browser session.");
  }

  return (
    <>
      <section className="glass panel">
        <div className="tag">Scoring Rules</div>
        <h3>Define how trainee responses are graded</h3>
        <p className="disclaimer">Keep weight totals at 100% for consistent coaching feedback.</p>

        <div className="split">
          <label className="field">
            Rebuttal accuracy ({weights.rebuttalAccuracy}%)
            <input
              type="range"
              min={0}
              max={100}
              value={weights.rebuttalAccuracy}
              onChange={(event) => setWeight("rebuttalAccuracy", Number(event.target.value))}
            />
          </label>
          <label className="field">
            Execution quality ({weights.executionQuality}%)
            <input
              type="range"
              min={0}
              max={100}
              value={weights.executionQuality}
              onChange={(event) => setWeight("executionQuality", Number(event.target.value))}
            />
          </label>
          <label className="field">
            Timing ({weights.timing}%)
            <input
              type="range"
              min={0}
              max={100}
              value={weights.timing}
              onChange={(event) => setWeight("timing", Number(event.target.value))}
            />
          </label>
          <label className="field">
            Prospect response ({weights.prospectResponse}%)
            <input
              type="range"
              min={0}
              max={100}
              value={weights.prospectResponse}
              onChange={(event) => setWeight("prospectResponse", Number(event.target.value))}
            />
          </label>
        </div>

        <div className="hero-actions">
          <button className="button" type="button" onClick={onSave}>
            Save scoring rules
          </button>
        </div>

        <div className="metric">
          <span>Total</span>
          <strong>{total}%</strong>
          <span className="disclaimer">{total === 100 ? "Ready to use" : "Adjust values until total is 100%"}</span>
        </div>
        {status ? <p className="disclaimer">{status}</p> : null}
      </section>

      <section className="glass panel">
        <div className="tag">Grade Bands</div>
        <h3>Recommended performance bands</h3>
        <div className="grid">
          <div className="metric">
            <span>Excellent</span>
            <strong>90-100</strong>
          </div>
          <div className="metric">
            <span>Good</span>
            <strong>75-89</strong>
          </div>
          <div className="metric">
            <span>Fair</span>
            <strong>60-74</strong>
          </div>
          <div className="metric">
            <span>Poor</span>
            <strong>0-59</strong>
          </div>
        </div>
      </section>
    </>
  );
}
