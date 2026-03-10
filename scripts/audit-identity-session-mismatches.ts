import { config as loadDotenv } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

loadDotenv({ path: ".env.local" });

type AdminConvexHttpClient = ConvexHttpClient & { setAdminAuth?: (token: string) => void };

const auditIdentityAndSessionMismatchesRef = makeFunctionReference<"query">(
  "support:auditIdentityAndSessionMismatches",
);

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function parseArg(flag: string) {
  const index = process.argv.findIndex((arg) => arg === flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const convexUrl = getRequiredEnv("CONVEX_URL");
  const convexAdminKey = getRequiredEnv("CONVEX_ADMIN_KEY");

  const client = new ConvexHttpClient(convexUrl);
  const adminClient = client as AdminConvexHttpClient;
  if (typeof adminClient.setAdminAuth === "function") {
    adminClient.setAdminAuth(convexAdminKey);
  } else {
    client.setAuth(convexAdminKey);
  }

  const orgId = parseArg("--orgId");
  const staleAssignedAfterHours = parseArg("--staleAssignedAfterHours");
  const staleStartedAfterHours = parseArg("--staleStartedAfterHours");
  const sampleLimit = parseArg("--sampleLimit");

  const result = await client.query(
    auditIdentityAndSessionMismatchesRef,
    {
      orgId,
      staleAssignedAfterHours: staleAssignedAfterHours ? Number(staleAssignedAfterHours) : undefined,
      staleStartedAfterHours: staleStartedAfterHours ? Number(staleStartedAfterHours) : undefined,
      sampleLimit: sampleLimit ? Number(sampleLimit) : undefined,
    } as never,
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[audit:identity-sessions] fatal error", error);
  process.exitCode = 1;
});
