"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildDefaultTrainingPlans, type CoachingDraft, type TrainerTrainingPlans, type TrainingGoalDraft } from "@/lib/trainer-plans";

type GoalKey = "day30" | "day60" | "day90";

type PlansApiResponse = {
  ok?: boolean;
  plans?: TrainerTrainingPlans;
  updatedAt?: number | null;
  error?: string;
};

const PLAN_ORDER: Array<{ key: GoalKey; label: string }> = [
  { key: "day30", label: "30-Day Plan" },
  { key: "day60", label: "60-Day Plan" },
  { key: "day90", label: "90-Day Plan" },
];

export default function TrainingPlansPage() {
  const [plans, setPlans] = useState<TrainerTrainingPlans>(() => buildDefaultTrainingPlans());
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const completionCount = useMemo(() => {
    return PLAN_ORDER.filter(({ key }) => plans[key].goal.trim().length > 0 && plans[key].targetDate.trim().length > 0).length;
  }, [plans]);

  function formatUpdatedAt(value: number | null) {
    if (!value) {
      return "Not saved yet";
    }
    return new Date(value).toLocaleString();
  }

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/trainer/training-plans", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as PlansApiResponse;
      if (!response.ok || !payload.ok || !payload.plans) {
        throw new Error(payload.error ?? "Unable to load team plans.");
      }

      setPlans(payload.plans);
      setLastUpdatedAt(payload.updatedAt ?? null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load team plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  function updateGoal<K extends keyof TrainingGoalDraft>(key: GoalKey, field: K, value: TrainingGoalDraft[K]) {
    setPlans((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        [field]: value,
      },
    }));
  }

  function updateCoaching<K extends keyof CoachingDraft>(field: K, value: CoachingDraft[K]) {
    setPlans((previous) => ({
      ...previous,
      coaching: {
        ...previous.coaching,
        [field]: value,
      },
    }));
  }

  async function savePlan() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/trainer/training-plans", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plans }),
      });
      const payload = (await response.json().catch(() => ({}))) as PlansApiResponse;
      if (!response.ok || !payload.ok || !payload.plans) {
        throw new Error(payload.error ?? "Unable to save team plans.");
      }

      setPlans(payload.plans);
      setLastUpdatedAt(payload.updatedAt ?? null);
      setStatus("Team 30/60/90 plan saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save team plans.");
    } finally {
      setSaving(false);
    }
  }

  function resetPlan() {
    const defaults = buildDefaultTrainingPlans();
    setPlans(defaults);
    setStatus("Defaults loaded. Click Save plan to publish team-wide.");
  }

  return (
    <>
      <section className="glass panel">
        <div className="tag">Training Plans</div>
        <h3>Editable 30/60/90 day goals</h3>
        <p className="disclaimer">Set team milestones, track targets, and publish updates for all trainers.</p>
        <div className="hero-actions">
          <button className="button" type="button" onClick={() => void savePlan()} disabled={loading || saving}>
            {saving ? "Saving..." : "Save plan"}
          </button>
          <button className="button secondary" type="button" onClick={resetPlan} disabled={loading || saving}>
            Reset defaults
          </button>
          <button className="button secondary" type="button" onClick={() => void loadPlans()} disabled={loading || saving}>
            {loading ? "Loading..." : "Reload team plan"}
          </button>
        </div>
        <div className="metric">
          <span>Milestones configured</span>
          <strong>{completionCount} / 3</strong>
          <span className="disclaimer">Last updated: {formatUpdatedAt(lastUpdatedAt)}</span>
        </div>
        {status ? <p className="disclaimer">{status}</p> : null}
      </section>

      <section className="glass panel">
        <div className="tag">30/60/90</div>
        <h3>Team milestone editor</h3>
        <div className="split">
          {PLAN_ORDER.map(({ key, label }) => (
            <article className="card" key={key}>
              <h4>{label}</h4>
              <label className="field">
                Goal
                <textarea
                  rows={3}
                  value={plans[key].goal}
                  disabled={loading || saving}
                  onChange={(event) => updateGoal(key, "goal", event.target.value)}
                  placeholder="Example: 50% of team at Level 3"
                />
              </label>
              <label className="field">
                Metric target
                <input
                  value={plans[key].metricTarget}
                  disabled={loading || saving}
                  onChange={(event) => updateGoal(key, "metricTarget", event.target.value)}
                  placeholder="Example: Avg score 75%+"
                />
              </label>
              <label className="field">
                Target date
                <input
                  type="date"
                  value={plans[key].targetDate}
                  disabled={loading || saving}
                  onChange={(event) => updateGoal(key, "targetDate", event.target.value)}
                />
              </label>
              <label className="field">
                Coach notes
                <textarea
                  rows={3}
                  value={plans[key].notes}
                  disabled={loading || saving}
                  onChange={(event) => updateGoal(key, "notes", event.target.value)}
                  placeholder="Notes to keep this milestone on track"
                />
              </label>
            </article>
          ))}
        </div>
      </section>

      <section className="glass panel">
        <div className="tag">Coaching Block</div>
        <h3>Plan the next group session</h3>
        <div className="split">
          <label className="field">
            Topic
            <input
              value={plans.coaching.topic}
              disabled={loading || saving}
              onChange={(event) => updateCoaching("topic", event.target.value)}
              placeholder='Example: Mastering "Spouse" objections'
            />
          </label>
          <label className="field">
            Focus rebuttal type
            <select
              value={plans.coaching.focusType}
              disabled={loading || saving}
              onChange={(event) => updateCoaching("focusType", event.target.value)}
            >
              <option value="busy">busy</option>
              <option value="send_info">send_info</option>
              <option value="dont_remember">dont_remember</option>
              <option value="not_interested">not_interested</option>
              <option value="spouse">spouse</option>
              <option value="timing">timing</option>
              <option value="already_covered">already_covered</option>
            </select>
          </label>
          <label className="field">
            Session date and time
            <input
              type="datetime-local"
              value={plans.coaching.scheduledAt}
              disabled={loading || saving}
              onChange={(event) => updateCoaching("scheduledAt", event.target.value)}
            />
          </label>
          <label className="field">
            Attendees
            <input
              value={plans.coaching.attendees}
              disabled={loading || saving}
              onChange={(event) => updateCoaching("attendees", event.target.value)}
              placeholder="Example: Team Alpha"
            />
          </label>
        </div>
        <label className="field">
          Session agenda
          <textarea
            rows={4}
            value={plans.coaching.agenda}
            disabled={loading || saving}
            onChange={(event) => updateCoaching("agenda", event.target.value)}
            placeholder="Add coaching agenda, call goals, and follow-up items."
          />
        </label>
      </section>
    </>
  );
}
