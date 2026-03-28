# Authenticated Demo Prospect Flow Design

## Summary

Replace the current cookie-only public demo funnel with an authenticated prospect flow backed by Clerk from the first demo request. A prospect who submits the demo form should immediately become a real Clerk user, be attached to a real Clerk organization created from the submitted organization name, receive an authenticated email link, and land on a protected `/demo` route already signed in and scoped to their own organization.

## Requirements

- Demo requests must create or reuse a Clerk user using the submitted email.
- Demo requests must create or reuse a Clerk organization using the submitted organization name.
- The requesting user must be added to that organization during demo signup.
- Prospects must not be sent to generic Clerk sign-in before the app has provisioned their identity.
- `/demo` must be an authenticated route and must require a signed-in Clerk session.
- `/demo` must load in the user's organization context.
- Demo users must not re-enter their name, email, or organization after the initial form submit.
- Existing demo users get `2` demos total.
- Brand-new demo users may receive the default new-user allowance configured by the demo system.
- The system must log enough events to answer:
  - who requested a demo
  - whether Clerk user creation succeeded
  - whether Clerk org creation/membership succeeded
  - whether the email link was sent
  - whether the user reached `/demo`
  - whether the user started a demo call
  - why demo start failed

## Business Logic

- A demo request is a real production prospect event, not a development-only trial flow.
- Clerk is the source of truth for authenticated identity from the start of the funnel.
- Convex is the source of truth for demo-state, demo limits, and funnel telemetry.
- Organization capture is part of the initial demo form because the prospect should land in the correct org context immediately.
- The public demo is term-only, so policy type does not need to be collected during the prospect flow.
- Returning demo prospects should be recognized and handled as existing identities rather than treated as anonymous trial users.
- The demo limit rule is stricter for returning demo prospects: existing demo users have `2` demos total.

## Architecture

### Lead submission

`src/app/api/lead/route.ts`

- Validate `name`, `organization`, and `email`.
- Upsert a Clerk user by normalized email.
- Create or reuse a Clerk organization by normalized org name / slug.
- Create or reuse organization membership for the prospect user.
- Persist demo lifecycle state in Convex using an authenticated demo-state record keyed by Clerk identity.
- Log provisioning and email-send events to Convex.
- Send an authenticated Clerk-backed email link rather than a custom anonymous verify-token flow.

### Verification/auth continuation

`src/app/api/verify/route.ts`

- Stop being the primary source of demo identity.
- Either:
  - become a thin bridge that validates a signed server token and exchanges it for a Clerk-authenticated continuation, or
  - be removed entirely if Clerk email-link authentication fully replaces it.

The preferred end state is that the prospect clicks a Clerk-backed authenticated link and lands already signed in.

### Demo route

`src/proxy.ts`

- Protect `/demo` again once Clerk provisioning is automatic.

`src/app/demo/page.tsx`

- Read Clerk auth and org context instead of demo cookies.
- Fail closed with a support-oriented message if auth exists but org context is missing or invalid.

### Demo call start

`src/app/api/vapi/trial/start/route.ts`

- Replace cookie-based demo identity checks with Clerk-authenticated user + org checks.
- Determine demo allowance based on the authenticated prospect identity.
- Enforce the returning-user rule that existing demo users get `2` demos total.
- Continue using Convex to reserve and count demo sessions, but key them by authenticated identity instead of `emailHash`.

### Clerk utilities

`src/lib/clerk-trainees.ts`

- Extract shared helpers or add a sibling utility for demo-prospect provisioning:
  - normalize/split names
  - upsert Clerk user by email
  - create or reuse Clerk organization
  - create or reuse organization membership

### Convex demo-state

`convex/schema.ts`

- Add a dedicated `demoProspects` table keyed by authenticated identity:
  - `clerkUserId`
  - `orgId`
  - `email`
  - `name`
  - `organizationName`
  - `status`
  - `demoCount`
  - `demoLimit`
  - `firstRequestedAt`
  - `lastDemoStartedAt`
  - `convertedAt`
- Update `trialSessions` to include authenticated identity fields rather than relying only on `emailHash`.

## Edge Cases And Error Handling

- If the email already belongs to a Clerk user, reuse that user.
- If the organization already exists, reuse it instead of creating a duplicate.
- If the user exists but is not yet in the organization, add the membership.
- If the email send fails after identity provisioning succeeds, return a recoverable error and log the partially completed state.
- If auth succeeds but `/demo` loads without an active org, show a clear support message and record an alert.
- If the same prospect submits multiple times, the flow must remain idempotent.
- If a returning demo user has already exhausted the `2`-demo total limit, `/demo` should show an upgrade/next-step state instead of failing ambiguously.

## Testing Strategy

- Route tests for lead submission covering:
  - brand-new prospect provisioning
  - existing user reuse
  - existing org reuse
  - membership creation
  - email-send failure after provisioning
- Authenticated demo route tests covering:
  - authenticated + org present
  - authenticated + org missing
  - unauthenticated redirect behavior
- Trial-start route tests covering:
  - authenticated prospect allowed to start
  - existing demo user limited to `2` total demos
  - exhausted demo allowance
  - missing org context
- Regression test ensuring `/demo` is protected only after provisioning/auth continuation is in place.
