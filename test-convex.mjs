import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.CONVEX_URL);
if (typeof client.setAdminAuth === "function") {
  client.setAdminAuth(process.env.CONVEX_ADMIN_KEY);
} else {
  client.setAuth(process.env.CONVEX_ADMIN_KEY);
}

async function run() {
  try {
    const res = await client.mutation("sessions:createTrainingSession", {
      orgId: "org_2teVnONC3Hn4fX9oV04R846oT6Z",
      trainerId: "user_2teVnONC3Hn4fX9oV04R846oT6Z",
      assistantId: "ast_123",
      difficulty: "D2",
      objectionsRequired: 1,
      rebuttalKeys: ["test"],
      channel: "web",
      initialStatus: "assigned",
    });
    console.log("Success!", res);
  } catch (err) {
    console.error("Convex error:", err);
  }
}

run();
