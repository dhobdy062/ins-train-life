const FAQ_ITEMS = [
  {
    question: "How do difficulty levels work?",
    answer:
      "D1 builds confidence with low resistance, while D5 tests high resistance and stacked objections. Move trainees up after consistent scores and low hard-stop rates.",
  },
  {
    question: "How should I use objection scores in coaching?",
    answer:
      "Review patterns by rebuttal type first. Coach one weak area at a time and assign focused practice sessions instead of broad feedback.",
  },
  {
    question: "When should a trainee advance?",
    answer:
      "Use a simple rule: average score above 75% for at least 10 sessions at the current level, with stable tone and few hard stops.",
  },
  {
    question: "How does trainee identity by IP work?",
    answer:
      "After invite consent, the trainee session is linked to a secure IP hash. Sessions from that network load the trainee profile automatically.",
  },
];

const PLAYBOOK_ROWS = [
  { rebuttal: "busy", strategy: "Acknowledge time pressure and offer one specific short slot." },
  { rebuttal: "send_info", strategy: "Explain why a short call gives better personalization than email alone." },
  { rebuttal: "dont_remember", strategy: "Give context details and ask permission to continue." },
  { rebuttal: "not_interested", strategy: "Validate first, then reframe around the trainee's value to the prospect." },
  { rebuttal: "spouse", strategy: "Respect the decision process and schedule a joint conversation." },
  { rebuttal: "timing", strategy: "Turn vague delay into a concrete date and time choice." },
  { rebuttal: "already_covered", strategy: "Confirm existing coverage and use diagnostic questions to identify gaps." },
];

export default function HelpPage() {
  return (
    <>
      <section className="glass panel">
        <div className="tag">Trainer Help</div>
        <h3>FAQ and coaching worksheets</h3>
        <p className="disclaimer">Use this page as your quick reference during 1:1 and group coaching sessions.</p>
      </section>

      <section className="glass panel">
        <div className="tag">FAQ</div>
        <h3>Common trainer questions</h3>
        <div className="split">
          {FAQ_ITEMS.map((item) => (
            <article className="card" key={item.question}>
              <h4>{item.question}</h4>
              <p className="disclaimer">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass panel">
        <div className="tag">Rebuttal Playbook</div>
        <h3>Core strategy map</h3>
        <div className="grid">
          {PLAYBOOK_ROWS.map((row) => (
            <div className="metric" key={row.rebuttal}>
              <span>{row.rebuttal}</span>
              <strong style={{ fontSize: "1rem", lineHeight: 1.4 }}>{row.strategy}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
