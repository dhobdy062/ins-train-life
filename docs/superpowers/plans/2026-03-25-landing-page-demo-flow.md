# Landing Page Demo Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the public landing page so the lead form is the only demo-entry CTA, verified users land on a dedicated `/demo` page, and the demo call starts from that page instead of the trainee dashboard.

**Architecture:** Keep the existing verification-token and `/api/vapi/trial/start` backend flow, but move the public experience onto a dedicated `/demo` page with neutral copy and recovery states. Update the public homepage and nav so the demo path is unambiguous, and cover the redirect/access edge cases with focused tests.

**Tech Stack:** Next.js App Router, React client components, Clerk auth UI, Jest, Testing Library, VAPI web client

---

## File Structure

- Modify: `src/app/page.tsx`
  - Remove homepage public CTAs, merge the difficulty/scoring content into one two-column section, keep only the signed-in workspace CTA.
- Create: `src/app/page.test.tsx`
  - Assert homepage hero CTA removal and the combined difficulty/scoring layout.
- Modify: `src/components/LeadForm.tsx`
  - Remove the paid-training CTA and keep the verification-link path as the only action on the card.
- Modify: `src/components/SiteNav.tsx`
  - Add the public FAQ link to `/FAQ_Page.html` with the same external-tab behavior as the footer.
- Modify: `src/app/demo/page.tsx`
  - Replace the current redirect with the dedicated public demo page experience.
- Create: `src/components/PublicDemoConsole.tsx`
  - Own the public demo-page copy, recovery states, and `Start a Demo Call` button while reusing the trial-call start flow.
- Modify: `src/components/TraineePracticeConsole.tsx`
  - Extract or move the reusable trial-start/call-state logic into a neutral shape if needed, without changing the `/api/vapi/trial/start` contract.
- Modify: `src/app/api/verify/route.ts`
  - Redirect success to `/demo?state=verified` and invalid/missing tokens to `/demo?state=invalid-link`.
- Create: `src/app/api/verify/route.test.ts`
  - Cover success, missing token, and invalid token redirect targets.
- Create: `src/components/LeadForm.test.tsx`
  - Assert the verification CTA remains and the removed CTA does not render.
- Create: `src/components/SiteNav.test.tsx`
  - Assert the FAQ link renders with the external destination and target.
- Create: `src/components/PublicDemoConsole.test.tsx`
  - Cover verified state, invalid-link state, direct-access recovery state, and the `Start a Demo Call` button label/behavior.

### Task 1: Remove Competing Homepage CTAs And Add FAQ Nav

**Files:**
- Modify: `src/app/page.tsx`
- Test: `src/app/page.test.tsx`
- Modify: `src/components/LeadForm.tsx`
- Modify: `src/components/SiteNav.tsx`
- Test: `src/components/LeadForm.test.tsx`
- Test: `src/components/SiteNav.test.tsx`

- [ ] **Step 1: Write the failing homepage test**

```tsx
it("removes public sample-call CTAs and shows only difficulty nodes", async () => {
  const Page = await Home({ searchParams: Promise.resolve({}) });
  render(Page);
  expect(screen.queryByRole("link", { name: /start a sample call/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /create trainer account/i })).not.toBeInTheDocument();
  expect(screen.getByText("D1")).toBeInTheDocument();
  expect(screen.queryByText(/busy schedule/i)).not.toBeInTheDocument();
  expect(screen.getByText(/objection handling/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the homepage test to verify it fails**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/app/page.test.tsx`
Expected: FAIL because the hero CTAs still render, the difficulty copy is not simplified, or the test file does not exist yet.

- [ ] **Step 3: Write the failing nav test**

```tsx
it("renders an FAQ link to the external FAQ page", () => {
  render(<SiteNav />);
  const faqLink = screen.getByRole("link", { name: /faq/i });
  expect(faqLink).toHaveAttribute("href", "/FAQ_Page.html");
  expect(faqLink).toHaveAttribute("target", "_blank");
});
```

- [ ] **Step 4: Run the nav test to verify it fails**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/components/SiteNav.test.tsx`
Expected: FAIL because the FAQ link test file or assertion does not yet match current nav output.

- [ ] **Step 5: Write the failing lead-form CTA test**

```tsx
it("keeps only the verification CTA on the lead form", () => {
  render(<LeadForm />);
  expect(screen.getByRole("button", { name: /send verification link/i })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /start paid training/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 6: Run the lead-form test to verify it fails**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/components/LeadForm.test.tsx`
Expected: FAIL because the paid-training CTA still renders or the test file does not exist yet.

- [ ] **Step 7: Implement the homepage/nav/lead-form cleanup**

Update:
- `src/components/SiteNav.tsx` to add the `FAQ` link alongside the existing signed-in/signed-out actions.
- `src/components/LeadForm.tsx` to remove the `Start paid training` link block.
- `src/app/page.tsx` to remove `Start a sample call` and `Create trainer account`, keep `Open workspace` for signed-in users, and merge the difficulty/scoring content into one two-column section showing only `D1`-`D5` on the left and scoring categories on the right.

- [ ] **Step 8: Run the focused homepage/nav tests**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/app/page.test.tsx src/components/LeadForm.test.tsx src/components/SiteNav.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit Task 1**

```bash
git add src/app/page.tsx src/app/page.test.tsx src/components/LeadForm.tsx src/components/SiteNav.tsx src/components/LeadForm.test.tsx src/components/SiteNav.test.tsx
git commit -m "feat: simplify homepage demo entry points"
```

### Task 2: Redirect Verification Into A Dedicated Demo Page

**Files:**
- Modify: `src/app/api/verify/route.ts`
- Modify: `src/app/demo/page.tsx`
- Create: `src/components/PublicDemoConsole.tsx`
- Modify: `src/components/TraineePracticeConsole.tsx`
- Test: `src/app/api/verify/route.test.ts`
- Test: `src/components/PublicDemoConsole.test.tsx`

- [ ] **Step 1: Write the failing verification-route redirect test**

```ts
it("redirects valid verification to /demo?state=verified", async () => {
  const response = await GET(new Request("http://localhost/api/verify?token=valid"));
  expect(response.headers.get("location")).toContain("/demo?state=verified");
});

it("redirects missing or invalid verification to /demo?state=invalid-link", async () => {
  const response = await GET(new Request("http://localhost/api/verify"));
  expect(response.headers.get("location")).toContain("/demo?state=invalid-link");
});
```

- [ ] **Step 2: Run the verification-route test to verify it fails**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/app/api/verify/route.test.ts`
Expected: FAIL because the current route still redirects into `/dashboard/trainee` or the test file does not exist yet.

- [ ] **Step 3: Write the failing public-demo-console test**

```tsx
it("shows the verified demo CTA", () => {
  render(<PublicDemoConsole state="verified" hasValidDemoAccess />);
  expect(screen.getByRole("button", { name: /start a demo call/i })).toBeInTheDocument();
});

it("shows recovery copy when demo cookies are missing", () => {
  render(<PublicDemoConsole state="default" hasValidDemoAccess={false} />);
  expect(screen.getByText(/verification is required/i)).toBeInTheDocument();
});

it("shows the upgrade path when the trial limit is reached", () => {
  render(<PublicDemoConsole state="verified" hasValidDemoAccess trialLimitReached />);
  expect(screen.getByRole("link", { name: /upgrade to continue practice/i })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the public-demo-console test to verify it fails**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/components/PublicDemoConsole.test.tsx`
Expected: FAIL because the component does not exist yet.

- [ ] **Step 5: Implement the redirect and dedicated demo page**

Update:
- `src/app/api/verify/route.ts` to redirect success to `/demo?state=verified` and invalid/missing tokens to `/demo?state=invalid-link`.
- `src/app/demo/page.tsx` to render the public demo page instead of redirecting to workspace selection.
- `src/components/PublicDemoConsole.tsx` to present:
  - verified success state
  - invalid-link recovery state
  - direct-access/missing-cookie recovery state
  - `Start a Demo Call` primary action
  - call-start failure messaging
  - trial-limit upgrade CTA state
- Extract only the reusable trial-start logic from `src/components/TraineePracticeConsole.tsx` if needed; keep `/api/vapi/trial/start` unchanged and do not duplicate that API contract.

- [ ] **Step 6: Run the focused redirect/demo tests**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/app/api/verify/route.test.ts src/components/PublicDemoConsole.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit Task 2**

```bash
git add src/app/api/verify/route.ts src/app/api/verify/route.test.ts src/app/demo/page.tsx src/components/PublicDemoConsole.tsx src/components/PublicDemoConsole.test.tsx src/components/TraineePracticeConsole.tsx
git commit -m "feat: route verified leads to dedicated demo page"
```

### Task 3: Final Demo Messaging And Recovery-State Coverage

**Files:**
- Modify: `src/components/PublicDemoConsole.tsx`
- Test: `src/components/PublicDemoConsole.test.tsx`

- [ ] **Step 1: Add a failing call-failure or recovery-state assertion**

```tsx
it("shows invalid-link recovery copy on the demo page", () => {
  render(<PublicDemoConsole state="invalid-link" hasValidDemoAccess={false} />);
  expect(screen.getByText(/verification link is invalid or expired/i)).toBeInTheDocument();
});

it("surfaces call-start failures with friendly demo copy", async () => {
  mockedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: "Unable to start trial call." }), { status: 500 }),
  );
  render(<PublicDemoConsole state="verified" hasValidDemoAccess />);
  await user.click(screen.getByRole("button", { name: /start a demo call/i }));
  expect(await screen.findByText(/we could not start your practice call/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the public-demo-console assertion to verify it fails**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/components/PublicDemoConsole.test.tsx`
Expected: FAIL until the recovery-state copy and behavior are complete.

- [ ] **Step 3: Implement the final public demo copy polish**

Update:
- `src/components/PublicDemoConsole.tsx` copy so it consistently uses demo language, not trainee/dashboard language.
- Ensure the recovery-state content points users back to the landing-page verification flow.

- [ ] **Step 4: Re-run the demo component tests**

Run: `PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath src/components/PublicDemoConsole.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add src/components/PublicDemoConsole.tsx src/components/PublicDemoConsole.test.tsx
git commit -m "feat: polish public demo messaging"
```

### Task 4: Final Verification

**Files:**
- Verify only: `src/app/page.tsx`
- Verify only: `src/components/LeadForm.tsx`
- Verify only: `src/components/SiteNav.tsx`
- Verify only: `src/app/demo/page.tsx`
- Verify only: `src/components/PublicDemoConsole.tsx`
- Verify only: `src/app/api/verify/route.ts`

- [ ] **Step 1: Run the focused automated suite**

Run:

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/npx jest --runInBand --runTestsByPath \
  src/app/page.test.tsx \
  src/components/LeadForm.test.tsx \
  src/components/SiteNav.test.tsx \
  src/app/api/verify/route.test.ts \
  src/components/PublicDemoConsole.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run eslint on the touched app/lib/component files**

Run:

```bash
PATH=/usr/local/bin:$PATH /usr/local/bin/npm exec -- eslint \
  src/app/page.tsx \
  src/app/page.test.tsx \
  src/components/LeadForm.tsx \
  src/components/SiteNav.tsx \
  src/app/demo/page.tsx \
  src/components/PublicDemoConsole.tsx \
  src/components/TraineePracticeConsole.tsx \
  src/app/api/verify/route.ts \
  src/app/api/verify/route.test.ts \
  src/components/LeadForm.test.tsx \
  src/components/SiteNav.test.tsx \
  src/components/PublicDemoConsole.test.tsx
```

Expected: no errors

- [ ] **Step 3: Manual browser verification**

Check:
- homepage no longer shows `Start a sample call`, `Create trainer account`, or `Start paid training`
- header FAQ link opens `/FAQ_Page.html`
- lead form still submits successfully
- valid verification lands on `/demo?state=verified`
- invalid verification lands on `/demo?state=invalid-link`
- direct `/demo` access without cookies shows recovery state
- verified `/demo` shows `Start a Demo Call`

- [ ] **Step 4: Commit final verification updates if needed**

```bash
git add <any final touched files>
git commit -m "test: verify landing page demo flow"
```
