import { EMAIL_SEQUENCE_ORDER } from "@/lib/brand";
import { getEmailSequenceRequirements } from "@/lib/email-sequences";

const LABELS: Record<(typeof EMAIL_SEQUENCE_ORDER)[number], string> = {
  trainer_welcome: "Trainer Welcome",
  trainee_invitation: "Trainee Invitation",
  session_summary: "Session Summary",
};

export default function SequencePlannerCard() {
  return (
    <section className="glass panel">
      <div className="tag">Email sequencing</div>
      <h3>Cream No Sugar sequence plan</h3>
      <p className="disclaimer">
        Sequence templates are configured with strict variable requirements before send and mapped into agent session
        variables.
      </p>

      <div className="grid">
        {EMAIL_SEQUENCE_ORDER.map((sequence) => (
          <div className="metric" key={sequence}>
            <span>{LABELS[sequence]}</span>
            <strong>{sequence}</strong>
            <p className="disclaimer">Required: {getEmailSequenceRequirements(sequence).join(", ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
