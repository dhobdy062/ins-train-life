import "dotenv/config";

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/trainer/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        traineeId: "j578x...", // need a real trainee ID
        difficulty: "D2",
        selectedObjections: [{ text: "I need to talk to my spouse", rebuttalType: "spouse_consult" }],
      }),
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

run();
