# Authenticated Demo Prospect Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cookie-based public demo flow with a Clerk-authenticated prospect flow that provisions a real user and org up front and tracks demo lifecycle in Convex.

**Architecture:** Use Clerk for identity and organization membership, then store demo lifecycle and limits in Convex keyed by `clerkUserId` and `orgId`. Replace the current verify-cookie branch with a Clerk sign-in token email, protect `/demo` again, and update demo start to authorize against Clerk auth plus Convex demo state.

**Tech Stack:** Next.js App Router, Clerk, Convex, Jest, ts-jest, Resend

---

### Task 1: Add Convex Demo-State Primitives

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/sessions.ts`
- Modify: `src/lib/convex.ts`

- [ ] **Step 1: Write the failing route tests that depend on authenticated demo-state**

Use the route tests in later tasks to assert behavior that requires:
- `demoProspects`-backed lifecycle state
- authenticated `trialSessions` keyed by `clerkUserId` and `orgId`

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/app/api/lead/route.test.ts src/app/api/vapi/trial/start/route.test.ts`

Expected: FAIL because the new Convex-backed demo helpers and schema behavior do not exist yet.

- [ ] **Step 3: Add the schema and helper functions**

Implement:
- `demoProspects` table in `convex/schema.ts`
- authenticated demo reservation/upsert helpers in `convex/sessions.ts`
- exported client wrappers in `src/lib/convex.ts`

- [ ] **Step 4: Re-run the focused tests**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/app/api/lead/route.test.ts src/app/api/vapi/trial/start/route.test.ts`

Expected: still failing, but now on route logic rather than missing helpers.

### Task 2: Provision Clerk Prospect + Org in Lead Submission

**Files:**
- Modify: `src/app/api/lead/route.ts`
- Create: `src/app/api/lead/route.test.ts`
- Create or Modify: `src/lib/clerk-demo-prospects.ts`

- [ ] **Step 1: Write the failing lead-route tests**

Cover:
- brand-new email provisions Clerk user + org + membership and sends a sign-in-token email
- existing user/org are reused
- Convex demo-state upsert is called
- email-send failure returns a recoverable error

- [ ] **Step 2: Run the lead-route tests to verify they fail**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/app/api/lead/route.test.ts`

Expected: FAIL because `/api/lead` still generates a custom verify token instead of provisioning authenticated prospects.

- [ ] **Step 3: Implement minimal lead-route changes**

Replace the current token email flow with:
- Clerk user lookup/create
- Clerk org lookup/create
- Clerk membership lookup/create
- sign-in token generation
- email containing the Clerk sign-in token URL
- Convex demo-state/logging writes

- [ ] **Step 4: Re-run the lead-route tests**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/app/api/lead/route.test.ts`

Expected: PASS

### Task 3: Restore Authenticated `/demo`

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/proxy.test.ts`
- Modify: `src/app/demo/page.tsx`
- Modify: `src/app/demo/page.test.tsx`
- Modify: `src/components/PublicDemoConsole.tsx`
- Modify: `src/components/PublicDemoConsole.test.tsx`

- [ ] **Step 1: Write or update the failing demo-route tests**

Cover:
- `/demo` is protected again
- authenticated users with org context see the demo page
- missing auth or missing org gets routed to the correct recovery/auth path
- public-demo copy/cookie assumptions are removed

- [ ] **Step 2: Run demo-route tests to verify they fail**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/proxy.test.ts src/app/demo/page.test.tsx src/components/PublicDemoConsole.test.tsx`

Expected: FAIL because the current implementation still assumes a public demo with cookie-based access.

- [ ] **Step 3: Implement minimal authenticated demo-route changes**

Update:
- `src/proxy.ts` to protect `/demo`
- `src/app/demo/page.tsx` to use Clerk auth + org
- `src/components/PublicDemoConsole.tsx` to present authenticated demo UX instead of verification-cookie UX

- [ ] **Step 4: Re-run demo-route tests**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/proxy.test.ts src/app/demo/page.test.tsx src/components/PublicDemoConsole.test.tsx`

Expected: PASS

### Task 4: Authorize Demo Call Start With Clerk + Convex Demo State

**Files:**
- Modify: `src/app/api/vapi/trial/start/route.ts`
- Create: `src/app/api/vapi/trial/start/route.test.ts`

- [ ] **Step 1: Write the failing trial-start route tests**

Cover:
- authenticated user + org + active demo prospect can start
- existing demo user is capped at 2 total demos
- exhausted demo user gets a limit response
- missing auth or missing org is rejected

- [ ] **Step 2: Run the trial-start route tests to verify they fail**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/app/api/vapi/trial/start/route.test.ts`

Expected: FAIL because the route still reads `demo_trial_identity` cookies and `emailHash`.

- [ ] **Step 3: Implement minimal authenticated trial-start logic**

Replace:
- cookie verification
- `emailHash`-only allowance checks

With:
- `auth()` user/org lookup
- Convex demo prospect lookup/upsert
- authenticated reservation keyed by `clerkUserId` and `orgId`

- [ ] **Step 4: Re-run the trial-start route tests**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/app/api/vapi/trial/start/route.test.ts`

Expected: PASS

### Task 5: Remove Obsolete Verify Flow and Run Focused Regression Suite

**Files:**
- Modify or Delete: `src/app/api/verify/route.ts`
- Modify or Delete: `src/app/api/verify/route.test.ts`
- Modify: `src/components/LeadForm.tsx`
- Modify: `src/components/LeadForm.test.tsx`

- [ ] **Step 1: Write/update tests for the final authenticated lead UX**

Cover:
- lead form no longer depends on policy type
- lead form success copy reflects authenticated email continuation
- obsolete verify-route assumptions are removed or redirected deliberately

- [ ] **Step 2: Run the focused regression tests to verify they fail**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/components/LeadForm.test.tsx src/app/api/verify/route.test.ts`

Expected: FAIL because the UI and verify tests still describe the old public demo flow.

- [ ] **Step 3: Implement the final cleanup**

Update:
- lead form fields/copy
- verify route behavior or removal
- obsolete public-demo expectations

- [ ] **Step 4: Run the focused regression suite**

Run: `PATH=/usr/local/bin:$PATH npx jest --runInBand --runTestsByPath src/app/api/lead/route.test.ts src/app/api/vapi/trial/start/route.test.ts src/proxy.test.ts src/app/demo/page.test.tsx src/components/PublicDemoConsole.test.tsx src/components/LeadForm.test.tsx`

Expected: PASS
