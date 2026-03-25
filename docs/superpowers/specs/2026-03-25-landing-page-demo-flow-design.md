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
5. `/api/verify` validates the token, sets the existing demo cookies, and redirects to a new dedicated demo page.
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
- Keep signed-in workspace access if appropriate, since that is an authenticated-user affordance rather than a public demo CTA.
- Remove the `Start paid training` CTA from the lead form card.
- Replace the current separate difficulty/scoring sections with one combined component or one unified section on the homepage.

### Public navigation
Update the public `SiteNav` component to include a visible `FAQ` link to `/FAQ_Page.html`.

Requirements:
- Only show on non-dashboard routes, matching current nav behavior.
- Open in a new tab to match the current footer behavior, unless existing header conventions suggest otherwise.

### Verification flow
Update `/api/verify`.

Current behavior:
- Valid token sets `demo_verified` and `demo_trial_identity` cookies.
- Redirects to `/dashboard/trainee`.

New behavior:
- Keep cookie behavior unchanged.
- Redirect to a dedicated public demo page, for example `/demo` or another clearly named route.
- Invalid or missing token should redirect to a safe public location tied to the demo path, not a trainee dashboard.

### Dedicated demo page
Create a dedicated page for verified demo users.

Requirements:
- Explain that verification succeeded.
- Present one clear primary action: `Start a Demo Call`.
- Use the existing trial call startup behavior already used by the trial console.
- Show status/error states for call start failures and trial-limit conditions.
- Avoid dashboard language, trainee identity framing, or internal workspace UI.

### Trial console reuse
Prefer reusing the existing `TraineePracticeConsole` behavior or extracting its logic into a more neutral public-facing demo console.

Requirements:
- If the current component language is too trainee-specific, rename or wrap it rather than duplicating the logic.
- Keep `/api/vapi/trial/start` as the backend integration unless implementation review reveals a blocker.

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

### Manual
- Submit lead form and confirm email link generation path.
- Click verification link and confirm redirect goes to the new dedicated demo page.
- Start a demo call successfully from that page.
- Verify the header FAQ link goes to `/FAQ_Page.html`.
- Confirm removed buttons no longer appear on the landing page.

## Out of Scope
- Changing the backend trial limits.
- Reworking pricing or checkout flows beyond removing the public `Start paid training` CTA from the lead form card.
- Changing the external FAQ content itself.
- Altering authenticated trainer or trainee dashboard IA beyond removing the verified-demo redirect into the trainee dashboard.
