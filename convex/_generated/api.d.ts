/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as emails from "../emails.js";
import type * as identity from "../identity.js";
import type * as sessions from "../sessions.js";
import type * as storage from "../storage.js";
import type * as support from "../support.js";
import type * as traineeProfiles from "../traineeProfiles.js";
import type * as trainerObjections from "../trainerObjections.js";
import type * as trainerPlans from "../trainerPlans.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  emails: typeof emails;
  identity: typeof identity;
  sessions: typeof sessions;
  storage: typeof storage;
  support: typeof support;
  traineeProfiles: typeof traineeProfiles;
  trainerObjections: typeof trainerObjections;
  trainerPlans: typeof trainerPlans;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
