const OBJECTION_LIBRARY: Record<
  "D1" | "D2" | "D3" | "D4" | "D5",
  Array<{ text: string; rebuttalType: string; frequency: string }>
> = {
  D1: [
    { text: "I'm slammed right now and do not have time for an appointment.", rebuttalType: "busy", frequency: "Very common" },
    { text: "Can you just send me something to look at later?", rebuttalType: "send_info", frequency: "Common" },
  ],
  D2: [
    { text: "How did you get my number?", rebuttalType: "dont_remember", frequency: "Common" },
    { text: "I get a lot of calls like this. I'm not interested.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "Tell me what this is, but I am not setting an appointment.", rebuttalType: "not_interested", frequency: "Common" },
  ],
  D3: [
    { text: "I need to talk to my spouse first.", rebuttalType: "spouse", frequency: "Common" },
    { text: "Bad timing, I am handling family issues right now.", rebuttalType: "timing", frequency: "Common" },
    { text: "Can we revisit this in a few months?", rebuttalType: "timing", frequency: "Common" },
  ],
  D4: [
    { text: "I already have coverage.", rebuttalType: "already_covered", frequency: "Very common" },
    { text: "My job already gives me life insurance.", rebuttalType: "already_covered", frequency: "Common" },
    { text: "This sounds like a sales pitch.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "I do not have time for this right now.", rebuttalType: "busy", frequency: "Common" },
  ],
  D5: [
    { text: "Who are you again? I do not remember filling anything out.", rebuttalType: "dont_remember", frequency: "Common" },
    { text: "I am not interested. Stop calling.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "I do not like being pressured.", rebuttalType: "not_interested", frequency: "Common" },
    { text: "What happens to my personal information?", rebuttalType: "not_interested", frequency: "Common" },
    { text: "Do not contact me again.", rebuttalType: "busy", frequency: "Hard stop" },
  ],
};

export default function ObjectionsPage() {
  return (
    <>
      <section className="glass panel">
        <div className="tag">Objection Library</div>
        <h3>Use objection sets by difficulty level</h3>
        <p className="disclaimer">
          This library is built for coaching consistency. Keep rebuttal mapping stable while adapting wording to your market.
        </p>
      </section>

      {Object.entries(OBJECTION_LIBRARY).map(([difficulty, objections]) => (
        <section className="glass panel" key={difficulty}>
          <div className="tag">{difficulty}</div>
          <h3>{difficulty} objection set</h3>
          <div className="grid">
            {objections.map((objection) => (
              <div className="metric" key={`${difficulty}-${objection.text}`}>
                <span>{objection.frequency}</span>
                <strong style={{ fontSize: "1rem", lineHeight: 1.4 }}>{objection.text}</strong>
                <span className="disclaimer">Expected rebuttal: {objection.rebuttalType}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
