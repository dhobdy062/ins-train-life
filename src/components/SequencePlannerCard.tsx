import { EMAIL_SEQUENCE_ORDER } from "@/lib/brand";

const LABELS: Record<(typeof EMAIL_SEQUENCE_ORDER)[number], string> = {
  trainer_welcome: "Trainer onboarding",
  trainee_invitation: "Trainee kickoff",
  session_summary: "Session follow-up",
};

const DESCRIPTIONS: Record<(typeof EMAIL_SEQUENCE_ORDER)[number], string> = {
  trainer_welcome: "Confirms workspace access and sets coaching priorities.",
  trainee_invitation: "Welcomes each trainee and points them to their first practice.",
  session_summary: "Recaps call performance and highlights the next coaching step.",
};

export default function SequencePlannerCard() {
  return (
    <section className="glass panel">
      <div className="tag">Team flow</div>
      <h3>Coaching touchpoints</h3>
      <p className="disclaimer">
        Keep your team moving with a simple communication rhythm from onboarding through session follow-up.
      </p>

      <div className="grid">
        {EMAIL_SEQUENCE_ORDER.map((sequence) => (
          <div className="metric" key={sequence}>
            <span>{LABELS[sequence]}</span>
            <strong>Active</strong>
            <p className="disclaimer">{DESCRIPTIONS[sequence]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
