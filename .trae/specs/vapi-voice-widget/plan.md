# Plan: Vapi Voice Widget Integration (v3)

This plan details the implementation of a Vapi Voice widget triggered after a user submits a lead form and verifies their email. The feature includes IP-based usage control to limit demo calls.

## 1. Project Setup

* **Environment Variables**`VAPI_AGENT_ID=`VAPI\_ASSISTANT\_D1\_LIFE\_TEST\_ID

## 2. Backend Development (Convex)

* **Database Schema (`convex/schema.ts`):**

  * Define a new table `ipCallTracking` to monitor call usage per IP.

    * Fields: `ipAddress: v.string()`, `callCount: v.number()`.

    * Add an index to the `ipAddress` field for efficient lookups.

* **New Convex Mutation (`convex/voice.ts`):**

  * Create a public mutation `startDemoCall` that accepts an IP address.

  * **IP Tracking Logic:**

    1. Query the `ipCallTracking` table for the provided IP address.
    2. If no record exists, create one with `callCount: 1`.
    3. If a record exists with `callCount < 2`, increment the count.
    4. If `callCount` is 2 or more, throw a `ConvexError` to block the call.

  * **Vapi Call Initiation:**

    * If the call is allowed, make a `fetch` request to the Vapi API to create a new call, using the `VAPI_API_KEY` and `VAPI_AGENT_ID`.

    * Return the Vapi call data (specifically the widget URL) to the client.

## 3. Frontend Development (Next.js)

* **UI Cleanup (`src/app/page.tsx`):**

  * Remove the "Start a sample call" and "Open workspace" buttons from the main page to streamline the user flow.

* **Verification Flow Update (`src/app/api/verify/route.ts`):**

  * Modify the `GET` handler to redirect to a new `/demo-call` page instead of `/dashboard/trainee`.

  * Extract the user's IP address from the incoming `request`.

  * Pass the IP address as a query parameter in the redirect URL to the `/demo-call` page.

* **New Demo Call Page (`src/app/demo-call/page.tsx`):**

  * Create a new page component to host the Vapi widget.

  * **Page Logic:**

    1. Retrieve the IP address from the URL query parameters.
    2. On page load, call the `startDemoCall` Convex mutation with the IP address.
    3. Display a loading state while the call is being initiated.
    4. On a successful response, embed and launch the Vapi widget using the URL provided by the mutation.
    5. If the mutation fails (e.g., call limit reached), display an appropriate error message to the user.

* **Lead Form (`src/components/LeadForm.tsx`):**

  * No changes are required here, as the existing form submission process already triggers the verification email.

## 4. Testing

* **End-to-End Test:** Verify the complete user journey: form submission → email verification → redirection to the demo call page → Vapi widget launch.

* **IP Limit Test:** Confirm that a user from the same IP address can only make two calls.

* **Error Handling:** Ensure the UI correctly displays loading states and error messages (e.g., for invalid tokens or when the call limit is exceeded).

