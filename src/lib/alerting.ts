export async function notifyOps(message: string, context?: Record<string, unknown>) {
  const endpoint = process.env.ALERT_WEBHOOK_URL;
  if (!endpoint) {
    return;
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context, sentAt: new Date().toISOString() }),
    });
  } catch {
    // Best effort only. Webhook handlers should not fail due to alert transport issues.
  }
}
