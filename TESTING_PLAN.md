# Scale Readiness Testing Plan

This document outlines the comprehensive testing strategy to ensure the system is ready for scale, based on the `scale-readiness-checklist.md`.

## 1. System Architecture Analysis

- **High-Risk Areas**: Multi-tenancy, report pipeline, load handling, and reliability.
- **Dependencies**: Convex, Clerk, Vapi.
- **Testing Focus**: The testing strategy will prioritize the high-risk areas to ensure data isolation, pipeline integrity, and system stability under load.

## 2. Testing Strategy

### 2.1. Multi-Tenant Isolation

- **Unit Tests**: Use Jest to test all Convex query functions to ensure they are scoped by `orgId`.
- **Integration Tests**: Use Supertest to test all API endpoints to ensure they enforce tenant boundaries.
- **E2E Tests**: Use Playwright to test the UI to ensure that users can only see data belonging to their own organization.

### 2.2. Report Pipeline

- **Unit Tests**: Use Jest to test the idempotency of the `enqueueWebhookEvent` mutation.
- **Integration Tests**: Test the end-to-end pipeline from webhook ingestion to dashboard delivery.

### 2.3. Load Handling

- **Performance Tests**: Use Locust to simulate 100+ concurrent users creating training sessions.
- **Concurrency Tests**: Use integration tests to check for race conditions when processing concurrent webhooks.

### 2.4. Reliability

- **Unit Tests**: Use Jest to test the retry logic for failed webhook events.
- **Integration Tests**: Test the dead-letter handling for repeated failures.
- **Observability Tests**: Test that failures are logged and alerts are generated.

## 3. Frameworks and Tools

- **Unit/Integration**: Jest, Supertest
- **E2E**: Playwright
- **Load Testing**: Locust
- **CI/CD**: GitHub Actions (or similar)

## 4. Implementation Notes

- **Test-Driven Development (TDD)**: All new features and bug fixes should be implemented using TDD.
- **Mocking**: Use Jest's mocking capabilities to isolate tests and simulate dependencies.
- **Test Data**: Use test data factories to create consistent and realistic test data.
- **CI/CD**: All tests should be run automatically in a CI/CD pipeline on every pull request.

## 5. Pre-Rollout Tests

- 100-Agent Synthetic Load Test
- 5-Organization Tenancy Test
- Report Fan-Out Test for Trainer + Trainee Dashboards
- Retry/Idempotency Test for Duplicate Call-Session Events
- Failure Simulation for Queue Worker Outage

## 6. Go / No-Go Questions

- Can one agency only see its own data? (YES)
- Can a report fail and still be retried cleanly? (YES)
- Can the system survive bursts from hundreds of concurrent agents? (YES)
- Can we support a second organization without schema changes? (YES)
- Can trainer and trainee views be generated from the same stored report? (YES)
