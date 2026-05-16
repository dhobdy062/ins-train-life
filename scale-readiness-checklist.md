# CreamNoSugar Scale Readiness Checklist

## Goal
Be confident the system can support:
- hundreds of agents
- multiple agencies/organizations
- report ingestion from call sessions
- trainer dashboard visibility
- trainee dashboard visibility
- reliable operation under load

## Hard requirements

### Multi-tenant isolation
- Each organization must have its own tenant boundary.
- Data must be scoped by `organization_id` everywhere.
- No cross-tenant report leakage.
- Users can only see their own org’s agents, reports, sessions, and dashboards.

### Report pipeline
- Call-session reports must be generated into a structured format.
- Reports must be persisted before dashboard delivery.
- Trainer dashboard gets org-level reporting.
- Trainee dashboard gets only personal/team-relevant reporting.
- Report processing must be retry-safe and idempotent.

### Load handling
- System must handle concurrent call-session writes.
- Queue-based processing preferred for report generation.
- No synchronous dashboard updates on the critical path.
- Background jobs should recover from partial failure.

### Reliability
- Failed report jobs must retry automatically.
- Dead-letter handling for repeated failures.
- Observability for ingestion, processing, and dashboard sync.
- Alerts for tenant-level outages or queue backlogs.

## Recommended architecture
- Ingestion API receives raw call session events.
- Queue processes report generation asynchronously.
- Persistent report store saves normalized data.
- Dashboard reads from the report store, not directly from raw events.
- Tenant-aware auth middleware guards every request.

## Pre-rollout tests
- 100-agent synthetic load test.
- 5-organization tenancy test.
- Report fan-out test for trainer + trainee dashboards.
- Retry/idempotency test for duplicate call-session events.
- Failure simulation for queue worker outage.

## Go / no-go questions
- Can one agency only see its own data?
- Can a report fail and still be retried cleanly?
- Can the system survive bursts from hundreds of concurrent agents?
- Can we support a second organization without schema changes?
- Can trainer and trainee views be generated from the same stored report?
