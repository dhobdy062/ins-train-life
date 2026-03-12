# Identity and Session Integrity PRD

## Review Summary

This review confirms several critical product and operational risks, but not every claim in the original assessment is supported by the current code.

### Confirmed

- Identity drift is real. Trainee access currently depends on a mix of auth user id, org context, and email fallback, which can leave a valid signed-in user unable to resolve to a trainee record.
- Session integrity is incomplete. The data model supports `assigned`, `started`, `completed`, and `abandoned`, but there is no full stale-session classification path for missed or failed sessions.
- Operational visibility is weak. Alerts and failed email events are stored, but the admin dashboard only exposes revenue, not operational failures.
- Repo hygiene needs guardrails. The repo previously contained duplicate identity files, and the duplicate-file check should stay in regular verification to prevent stale copies from returning.
- Webhook hardening is incomplete. Signature verification exists for Clerk, Stripe, and VAPI, but there is no webhook rate limiting, IP policy, or replay monitoring beyond idempotency keys.

### Overstated or Unproven

- “Unsigned webhooks are accepted” is not supported by the current implementation. Clerk uses Svix verification, Stripe uses `constructEvent`, and VAPI uses HMAC verification.
- “The app will fail at 100+ users” is plausible but unproven from static review alone. The stronger claim is that the current architecture lacks clear evidence of operational readiness for scale.
- “Testing is 20-30% coverage” is directionally plausible, but this repo review did not produce a coverage report. What is provable is that only a small set of targeted tests exists today.

## Executive Summary

The product’s highest-risk issue is not frontend polish. It is identity and session integrity. Users can authenticate successfully and still fail to resolve to the correct trainee record, while trainers and admins lack reliable visibility into stalled, failed, or mismatched sessions. This PRD prioritizes identity correctness, session-state integrity, and operational reporting before UI refresh work.

## Problem

Trainers and trainees expect simple team-based access and reliable session handling. The current system exposes backend failure modes indirectly:

- A trainee can sign in and still fail to resolve into the trainee dashboard.
- A trainer can assign a session but has no complete flow to recover missed or failed sessions.
- Admins receive no in-product operational view of auth drift, invitation failures, or session mismatches.
- User-facing copy leaks backend implementation details such as Clerk and organization-context jargon.

## Goals

1. Establish one canonical identity resolution path for authenticated trainee access.
2. Detect, audit, and repair identity/session mismatches before UI redesign.
3. Classify and surface missed, stale, and failed sessions as operational states.
4. Remove backend jargon from end-user surfaces.
5. Add admin dashboard visibility for operational issues.

## Non-Goals

- Replatforming away from Clerk, Convex, Stripe, VAPI, or Resend.
- Full multi-region or infrastructure redesign in this phase.
- Final trainee dashboard visual redesign beyond enabling the future UI work with correct data.

## Users

- Trainee: signs in, sees the correct dashboard, starts assigned sessions, reviews results.
- Trainer: assigns sessions, resends or recreates failed work, coaches from accurate status.
- Admin/Ops: sees system issues quickly and can triage by org, trainee, and session.

## Scope

### In Scope

- Identity audit tooling for trainees, memberships, and session linkage.
- Canonical trainee resolver for authenticated requests.
- Repair path for trainee records that can be matched by email but are not linked to the current auth user.
- Session mismatch audit covering stale `assigned`, stale `started`, missing session user ids, and trainee/session identity drift.
- PRD-backed copy cleanup requirements for auth and session failure states.
- Admin operational dashboard requirements for alerts and session issues.

### Out of Scope

- Pricing strategy redesign.
- Vendor replacement decisions.
- Full analytics implementation.
- Full UI visual overhaul of all dashboards.

## Current State Findings

- Trainee dashboard UI is hardcoded and lacks shared auth/org navigation.
- Workspace routing and results loading use mixed identity resolution.
- Trainer session assignment is blocked by missing trainee auth linkage and exposes backend terms.
- Alert and email event data exist in storage but are not surfaced in admin workflows.

## Proposed Solution

### 1. Identity Source of Truth

- Treat the authenticated `userId + orgId` pair as the canonical access input.
- Resolve trainee access by direct trainee-to-auth link first.
- If direct linkage is missing, use a controlled email-match repair path that relinks the trainee record to the current authenticated identity and repairs open sessions.
- Use mirrored identity membership data only as a supporting record, not as a separate user-facing concept.

### 2. Identity and Session Audit

- Add an audit query and CLI entry point that reports:
  - trainees missing auth linkage
  - trainees with missing org membership
  - trainees recoverable by email match
  - assigned sessions missing `traineeClerkUserId`
  - sessions whose stored user id differs from the linked trainee
  - stale assigned sessions
  - stale started sessions
  - recent related alerts

### 3. Session Integrity

- Introduce operational classification for sessions that never start or never complete.
- Decide whether to expand the status model to `missed` and `failed`, or keep `abandoned` with required reason metadata.
- Give trainers recovery actions once the state model is reliable:
  - resend invite
  - create replacement session
  - mark missed

### 4. Copy and UX Cleanup

- Remove references to Clerk, Convex, and raw backend errors from end-user surfaces.
- Replace them with task-oriented language:
  - “Sign in to continue”
  - “Choose your team”
  - “Your training seat is not ready yet”
  - “This session needs attention”

### 5. Admin Operational Visibility

- Add an Admin Ops dashboard section that shows:
  - unresolved alerts
  - failed invites
  - stale assigned sessions
  - stale started sessions
  - identity drift counts by org
  - recent repair actions

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | System must resolve authenticated trainee access through one canonical resolver | P0 |
| FR2 | System must repair trainee identity linkage when a safe email match is found | P0 |
| FR3 | System must repair open session user linkage when trainee identity is relinked | P0 |
| FR4 | System must provide an audit report for identity/session mismatches | P0 |
| FR5 | Trainer workflow must support recovery actions for missed or failed sessions | P1 |
| FR6 | Admin dashboard must display operational issues in-product | P1 |
| FR7 | End-user copy must avoid backend vendor terminology | P1 |

## Non-Functional Requirements

- Security: keep webhook signature verification intact and do not expand trust in email fallback beyond controlled repair.
- Reliability: trainee resolution should not fail closed when identity mirroring is temporarily behind.
- Observability: every repair or mismatch category must be measurable.
- Maintainability: keep repo hygiene checks in the verification path so stale duplicate files do not return.

## Audit Plan

### Audit Questions

1. Which trainees exist by email but are not linked to the correct authenticated user?
2. Which trainee records reference user ids without active org memberships?
3. Which assigned sessions cannot start because the stored session user id is missing or stale?
4. Which started sessions are effectively hung because no completion arrived?
5. Which orgs generate repeated alert events tied to identity or session drift?

### Audit Outputs

- Count summary across all orgs
- Sample mismatches for manual triage
- Org-scoped audit run for support or engineering
- Baseline to compare pre- and post-fix error rates

## Milestones

### Milestone 1: Identity Integrity Foundation

- Canonical trainee resolver
- Repair mutation for trainee/session linkage
- Audit query and CLI script

### Milestone 2: Session Operational States

- Stale-session classification
- Recovery actions for trainers
- Alert generation for missed/failed sessions

### Milestone 3: Admin Ops Dashboard

- Operational issue summary cards
- Issue tables and filtering
- Resolution workflows

### Milestone 4: UI and Copy Refresh

- Trainee navbar integration
- Friendly auth and session copy
- Removal of backend jargon

## Success Metrics

- 0 unresolved trainee access failures caused by missing trainee auth linkage after repair path rollout
- 100% of stale assigned sessions detectable in audit output
- 100% of stale started sessions detectable in audit output
- 0 user-facing references to Clerk or Convex in trainer/trainee operational surfaces
- Admin can view operational issues without reading logs or Convex tables directly

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Email-match repair links the wrong user | High | Only repair inside the currently authenticated org and log every repair event |
| Identity mirror remains stale | Medium | Keep request-time sync best-effort, not blocking, and rely on canonical resolver |
| Session status expansion breaks analytics | Medium | Add migration plan and preserve backward-compatible aggregates |
| Stale duplicate files can return and confuse maintenance | Medium | Keep the duplicate-file hygiene check in regular verification |

## Immediate Implementation Slice

This repo change set starts Milestone 1 by:

- adding a canonical authenticated trainee resolver
- adding trainee/session identity repair
- adding an identity/session mismatch audit query
- adding a CLI script to run the audit against Convex

## Follow-Up Engineering Tasks

1. Add admin UI for the new audit output.
2. Add session classification job for stale assigned/started sessions.
3. Add trainer recovery actions.
4. Keep the duplicate-file hygiene check in regular verification.
5. Replace backend jargon in all trainer and trainee flows.
