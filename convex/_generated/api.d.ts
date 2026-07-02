/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_encryption from "../lib/encryption.js";
import type * as lib_googleApi from "../lib/googleApi.js";
import type * as routes_floors from "../routes/floors.js";
import type * as routes_google from "../routes/google.js";
import type * as routes_googleInternal from "../routes/googleInternal.js";
import type * as routes_googlePublic from "../routes/googlePublic.js";
import type * as routes_organizations from "../routes/organizations.js";
import type * as routes_reservations from "../routes/reservations.js";
import type * as routes_rooms from "../routes/rooms.js";
import type * as routes_users from "../routes/users.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "lib/auth": typeof lib_auth;
  "lib/encryption": typeof lib_encryption;
  "lib/googleApi": typeof lib_googleApi;
  "routes/floors": typeof routes_floors;
  "routes/google": typeof routes_google;
  "routes/googleInternal": typeof routes_googleInternal;
  "routes/googlePublic": typeof routes_googlePublic;
  "routes/organizations": typeof routes_organizations;
  "routes/reservations": typeof routes_reservations;
  "routes/rooms": typeof routes_rooms;
  "routes/users": typeof routes_users;
  seed: typeof seed;
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
