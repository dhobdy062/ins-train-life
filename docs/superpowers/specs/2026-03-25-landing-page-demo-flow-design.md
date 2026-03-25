# Landing Page Demo Flow Simplification Design

## Goal
Simplify the public landing page so visitors have one clear path into the free demo: submit the lead form, receive a verification link, land on a dedicated demo page, and start a demo call there. Remove competing or broken public CTAs that currently distract from or bypass that path.

## User-Facing Changes
- Remove the public homepage buttons:
  - `Start a sample call`
  - `Create trainer account`
  - `Start paid training`
- Keep the lead form as the single primary demo conversion action with `Send verification link`.
- Add `FAQ` to the public header navigation, linking to the existing external FAQ page at `/FAQ_Page.html`.
- Replace the current landing-page training overview sections with a single two-column component:
  - Left side: difficulty nodes only (`D1`, `D2`, `D3`, `D4`, `D5`)
  - Right side: scoring output/coaching metrics
- Change verification-link completion so users land on a dedicated demo-call page rather than the trainee dashboard.
- The dedicated demo page should present one primary button: `Start a Demo Call`.

## Intended Flow
1. Visitor arrives on homepage.
2. Visitor fills out the lead form and clicks `Send verification link`.
3. `/api/lead` emails the signed verification URL.
4. Visitor clicks the verification link.
5. `/api/verify` validates the token, sets the existing demo cookies, and redirects to `/demo?state=verified`.
6. Visitor sees a focused demo experience and clicks `Start a Demo Call`.
7. The page uses the existing free-trial VAPI start flow to begin the demo session.

## Recommended Approach
Use a dedicated public demo page that reuses the existing trial-call console behavior instead of sending users into `/dashboard/trainee`.

### Why this approach
- It removes the current mismatch between “demo” messaging and “dashboard” destination.
- It keeps trial/demo users separate from authenticated trainee workflows.
- It minimizes backend risk because the verification token, cookies, and `/api/vapi/trial/start` path already exist.
- It only requires changing the post-verification destination and introducing a clearer public-facing entry page.

## Alternatives Considered

### Option A: Redirect to trainee dashboard and auto-start there
Rejected because it still places demo users inside a dashboard context that implies an existing trainee account and ongoing training workflow.

### Option B: Auto-start the demo call immediately on page load after verification
Rejected because browser permission handling and voice-session startup are more reliable when the user initiates the action explicitly.

## Architecture and Component Changes

### Public homepage
Update the homepage to make the lead form the single public demo CTA.

Changes:
- Remove hero CTA buttons for sample call and trainer-account creation.
- Keep the signed-in `Open workspace` CTA for authenticated users only. This is not part of the public demo acquisition path and should remain available.
- Remove the `Start paid training` CTA from the lead form card.
- Replace the current separate difficulty/scoring sections with one combined component or one unified section on the homepage.
- Treat this CTA removal rule as applying to all public homepage entry points in this route, including desktop and mobile variants. Do not leave an alternate homepage CTA that bypasses verification.

### Public navigation
Update the public `SiteNav` component to include a visible `FAQ` link to `/FAQ_Page.html`.

Requirements:
- Only show on non-dashboard routes, matching current nav behavior.
- Open in a new tab to match the current footer behavior.
- Use the same FAQ destination and tab behavior across desktop and mobile navigation states.

### Verification flow
Update `/api/verify`.

Current behavior:
- Valid token sets `demo_verified` and `demo_trial_identity` cookies.
- Redirects to `/dashboard/trainee`.

New behavior:
- Keep cookie behavior unchanged.
- Redirect successful verification to `/demo?state=verified`.
- Redirect invalid, missing, or unverifiable tokens to `/demo?state=invalid-link`.
- Do not redirect any verification outcome into `/dashboard/trainee`.

### Dedicated demo page
Create a dedicated page for verified demo users.

Requirements:
- Explain that verification succeeded.
- Present one clear primary action: `Start a Demo Call`.
- Use the existing trial call startup behavior already used by the trial console.
- Show status/error states for call start failures and trial-limit conditions.
- Avoid dashboard language, trainee identity framing, or internal workspace UI.
- Remain on the dedicated demo page before, during, and after the call. Do not redirect into trainer or trainee dashboards as part of the demo flow.
- If `/demo` is visited directly without valid demo cookies, render a recoverable public state on the same page instead of redirecting to a dashboard. That state should explain that verification is required and direct the user back to the landing-page lead form to request a new verification link.
- If `/demo?state=invalid-link` is reached, render the same recoverable state with copy indicating that the verification link is invalid or expired.

### Trial console reuse
Reuse the existing `/api/vapi/trial/start` backend integration and the current trial call startup behavior, but expose it through a dedicated public demo-page component rather than the trainee dashboard.

Requirements:
- Do not duplicate the trial-start API contract.
- If the current `TraineePracticeConsole` UI language is too trainee-specific, extract or wrap its call-start logic into a neutral public demo component.
- The dedicated demo page should own its own copy, labels, and post-call state so the experience reads as a public product demo rather than a trainee workspace.

## Homepage Content Layout
Combine the current “Customize the Difficulty and Objections” and “Scoring output” areas into one unified two-column presentation.

### Left column: Difficulty
Display only:
- `D1`
- `D2`
- `D3`
- `D4`
- `D5`

Do not attach objection descriptions to these nodes on the landing page.

### Right column: Scoring Output
Display the coaching/scoring categories already shown today, such as:
- Objection handling
- Tone and pacing
- Close effectiveness
- Time to appointment

### Content intent
This section should explain the training system at a glance without overloading the visitor. The left side communicates adjustable difficulty; the right side communicates measurable output.

## Error Handling
- If `/api/lead` fails to send the email, keep the current inline error messaging.
- If verification token is invalid or missing, redirect to the public site rather than a dashboard route.
- If the verified user reaches the demo page but the trial cookies are missing or expired, the demo page should present a recoverable message and direct them to request a new verification link.
- If trial limits are exhausted, preserve the current upgrade CTA behavior.

## Testing

### Automated
- Homepage render test or component-level coverage for removed CTAs and added FAQ link.
- Verification route test updated for the new redirect target.
- Dedicated demo page test or trial-console test covering the new button label and expected call-start interaction.
- Lead form test verifying only the verification-link CTA remains.
- Verification route tests covering invalid and missing token redirects to `/demo?state=invalid-link`.
- Dedicated demo page tests covering direct `/demo` access without valid cookies and the resulting recovery state.

### Manual
- Submit lead form and confirm email link generation path.
- Click verification link and confirm redirect goes to the new dedicated demo page.
- Start a demo call successfully from that page.
- Visit `/demo` directly without verification and confirm the page shows the recovery state instead of a dashboard.
- Visit the verification route with an invalid token and confirm it lands on the recovery state for invalid links.
- Verify the header FAQ link goes to `/FAQ_Page.html`.
- Confirm removed buttons no longer appear on the landing page.

## Out of Scope
- Changing the backend trial limits.
- Reworking pricing or checkout flows beyond removing the public `Start paid training` CTA from the lead form card.
- Changing the external FAQ content itself.
- Altering authenticated trainer or trainee dashboard IA beyond removing the verified-demo redirect into the trainee dashboard.
