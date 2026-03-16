type HelpItem = {
  question: string;
  answer: string;
};

type GuideItem = {
  title: string;
  steps: string[];
};

const TRAINER_FAQ: HelpItem[] = [
  {
    question: "How do I add team members?",
    answer:
      "Open Team Members, add name and email, set a starting difficulty, and set an objection count. Share the invite link so the trainee can begin.",
  },
  {
    question: "How do I set up training calls?",
    answer:
      "Go to Training Calls, pick the trainee, set difficulty, choose objection count, then create the session. Use this to run focused coaching blocks.",
  },
  {
    question: "How should I coach objections and rebuttals?",
    answer:
      "Review weak rebuttal types first, coach one improvement theme at a time, and run short repeat sessions on the same objection category until scores stabilize.",
  },
  {
    question: "When should a trainee advance to the next level?",
    answer:
      "Use a clear progression rule: 75%+ average score across at least 10 sessions at the current level, with consistent delivery and low hard-stop rate.",
  },
  {
    question: "How should I run weekly coaching reviews?",
    answer:
      "Start with score trend, then review hard-stop rate, then review weakest objection/rebuttal categories. End each review with one concrete focus for the next week.",
  },
];

const TRAINEE_FAQ: HelpItem[] = [
  {
    question: "How do difficulty levels work?",
    answer:
      "D1 builds confidence with lighter objections. Each level adds pressure and complexity through tougher resistance and stacked objections.",
  },
  {
    question: "How does scoring work?",
    answer:
      "Each response is graded across rebuttal accuracy, execution quality, timing, and prospect outcome. The weighted score becomes your session score.",
  },
  {
    question: "What is a hard stop?",
    answer:
      "A hard stop is a failed interaction where the prospect clearly shuts down the conversation. Trainers use hard-stop trends to coach tone and pacing.",
  },
  {
    question: "How can I improve faster?",
    answer:
      "Focus on one rebuttal type at a time, repeat sessions in that category, and apply the coaching notes from your last session before moving up.",
  },
];

const QUICK_GUIDES: GuideItem[] = [
  {
    title: "How to add team members",
    steps: [
      "Open Team Members and click Add trainee.",
      "Enter name, email, starting level, and objection count.",
      "Send invite link and confirm they start their first call.",
    ],
  },
  {
    title: "How to set up training calls",
    steps: [
      "Open Training Calls and select the trainee.",
      "Set difficulty and objection count for the session focus.",
      "Create the session and schedule coaching follow-up.",
    ],
  },
  {
    title: "How to use objections and rebuttals",
    steps: [
      "Maintain objection wording in the Objection Library.",
      "Update response guidance in Rebuttal Strategies.",
      "Run focused sessions, then review by rebuttal type.",
    ],
  },
  {
    title: "How scoring is calculated",
    steps: [
      "Rebuttal accuracy measures strategy selection.",
      "Execution quality measures tone, clarity, and specificity.",
      "Timing and prospect outcome capture response quality under pressure.",
    ],
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

export default function TrainerFaqPage() {
  return (
    <>
      <section className="glass panel">
        <div className="tag">FAQ</div>
        <h3>Trainer and trainee documentation</h3>
        <p className="disclaimer">Use this page as your team reference for onboarding, coaching, and scoring.</p>
      </section>

      <section className="glass panel">
        <div className="tag">Quick Start</div>
        <h3>Core workflows</h3>
        <div className="split">
          {QUICK_GUIDES.map((guide) => (
            <article className="card" key={guide.title}>
              <h4>{guide.title}</h4>
              <ol style={{ margin: "10px 0 0", paddingLeft: "1.1rem", display: "grid", gap: "6px" }}>
                {guide.steps.map((step) => (
                  <li key={step} className="disclaimer">
                    {step}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="glass panel">
        <div className="tag">FAQ</div>
        <h3>Common trainer questions</h3>
        <div className="split">
          {TRAINER_FAQ.map((item) => (
            <article className="card" key={item.question}>
              <h4>{item.question}</h4>
              <p className="disclaimer">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass panel">
        <div className="tag">FAQ</div>
        <h3>Common trainee questions</h3>
        <div className="split">
          {TRAINEE_FAQ.map((item) => (
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
