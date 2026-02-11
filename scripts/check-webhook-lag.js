const appUrl = process.env.APP_URL;
const cronSecret = process.env.CRON_SECRET;

if (!appUrl) {
  throw new Error("Missing APP_URL");
}

if (!cronSecret) {
  throw new Error("Missing CRON_SECRET");
}

async function run() {
  const target = new URL("/api/internal/webhook-lag", appUrl).toString();
  const response = await fetch(target, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Lag check failed (${response.status}): ${body}`);
  }

  console.log(`Lag check ok: ${body}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
