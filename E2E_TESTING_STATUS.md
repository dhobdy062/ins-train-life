# E2E Testing Status & Troubleshooting Guide

**Last Updated:** 2026-05-14

## 1. Current Status: Blocked

The End-to-End (E2E) test suite is currently **blocked**. While all underlying environmental issues (WSL conflicts, disk space, Node.js corruption) have been resolved, the tests are failing due to a fundamental version incompatibility between the project's core dependencies: **Playwright, Clerk, and Next.js**.

**The Root Cause:** The Playwright test runner is not recognizing the `clerk` fixture provided by the `@clerk/testing` library, resulting in the error `Test has unknown parameter "clerk"`. This prevents the tests from authenticating correctly.


## 2. Troubleshooting Steps Taken

A comprehensive investigation was performed to isolate the issue. The following is a summary of the steps taken, which can serve as a reference for future debugging.

- **Environment Stabilization:**
  - **WSL/Windows Conflict:** Confirmed tests must be run from a native Windows environment, not a WSL shell, to prevent networking and file path issues.
  - **Disk Space (`ENOSPC`):** Resolved by clearing sufficient disk space on the machine.
  - **Node.js/npm Corruption:** Fixed by reinstalling Node.js and npm to resolve critical execution errors (`-1073741510`).
  - **Dependency Integrity:** Performed a clean reinstall of all `node_modules` to fix corruption and SWC dependency warnings.

- **Authentication Strategies Attempted:**
  1.  **Direct Form Interaction:** Initial tests failed to interact with Clerk's sign-in form because it is rendered within an `iframe`.
  2.  **Programmatic Cookie Injection:** A `global.setup.ts` file was created to programmatically generate a Clerk session and inject the `__session` cookie into the browser. This failed because the Next.js server-side `auth()` helper did not recognize the manually set cookie.
  3.  **Decoupled Web Server:** To rule out server startup issues, the `webServer` was removed from the Playwright config, and the dev server was run manually. This led to `net::ERR_CONNECTION_REFUSED` errors, indicating the test runner could not connect to the manually started server, likely due to firewall or process isolation issues.
  4.  **Official Clerk Testing Library:** The current and most idiomatic approach was implemented using the `@clerk/testing` package. This led to the current `Test has unknown parameter "clerk"` error, confirming a deep integration issue.


## 3. Path Forward & Required Actions

The problem is not a simple bug but a fundamental dependency conflict. To unblock the E2E tests, the project's dependencies must be brought into a compatible state.

**Primary Action:**

1.  **Conduct a Dependency Audit:**
    -   Carefully review the official documentation for Playwright, Clerk (specifically `@clerk/nextjs` and `@clerk/testing`), and Next.js.
    -   Identify a matrix of versions that are explicitly stated to be compatible with one another.

2.  **Upgrade/Downgrade Core Dependencies:**
    -   Based on the audit, update the versions in `package.json` to a known-good combination.
    -   **Warning:** This is a significant change and may introduce breaking changes in the application code that will require further modifications.

3.  **Perform a Clean Re-install:**
    -   After updating `package.json`, delete the `node_modules` directory and the `package-lock.json` file.
    -   Run `npm install` to build a clean dependency tree from scratch.

4.  **Re-run the Test Suite:**
    -   Execute `npx playwright test`. With a compatible dependency set, the `clerk` fixture should be recognized, and the tests should begin to pass.


## 4. Incomplete Testing (Once Unblocked)

Once the primary blocker is resolved, the following testing work needs to be completed to ensure robust E2E coverage:

- **Fix `tenant-dashboards.spec.ts`:** The existing tests in this file need to be validated and fixed.
- **Implement User Persona Testing:** As discussed, the testing strategy must cover different user states to be meaningful. This involves:
    -   Creating setup scripts (similar to `e2e/setup/personas.ts`) for various user types:
        -   A user with an expired subscription.
        -   A new user with no subscription.
        -   An admin user.
    -   Writing new tests that log in as these personas and verify the correct application behavior (e.g., redirects to billing, feature access, etc.).
- **Validate Convex Data Sync:** Ensure that user metadata and entitlements set in Clerk are correctly synchronized to and acted upon in the Convex backend during the tests.
