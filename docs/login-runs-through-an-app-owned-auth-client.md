# Login runs through an app-owned auth client

## Applies when

Changing anything about login, tokens, user profile, roles or logout, or adding
code that needs the current user. The pieces live in `src/app/core/services/`.

**Not this if**: the question is which permissions a user has on a resource.
That is the Ladon preflight in `LadonService` and the permissions services,
which use the token but not this setup.

## The pieces

- `AuthClient` and the token `AUTH_CLIENT` (`auth-client.ts`) are the interface
  the app talks to: init, token, refresh, profile, roles, login, logout.
- `KeycloakPublicClient` (`keycloak-public-client.ts`) implements it for the
  browser login through keycloak-js.
- `KeycloakConfidentialService` (`keycloak-confidential.service.ts`) implements
  it for a confidential client: it asks for the client secret and a user name,
  exchanges a service-account token for a user token and keeps it in
  `sessionStorage`.
- `provideAuth()` (`provide-auth.ts`) picks the variant once:
  `environment.keyCloakConfidential === 'true'` (runtime variable
  `KEYCLOACK_CONFIDENTIAL`) selects the confidential client, anything else the
  public one.
- `authInterceptor` (`auth.interceptor.ts`) attaches `Authorization: Bearer
  <token>` for both variants. It skips the token endpoint, renews an expired
  token first and lets errors through unchanged.
- `AuthorizationService` is the facade the rest of the app uses. Components and
  services never inject a Keycloak class directly.

## Startup order

`initializerService` (`initializer.service.ts`) starts the login, then loads the
runtime configuration with the token, then (in dev) `assets/env.json`, then the
Ladon checks; on any failure it shows the error box. That order is why
`provideKeycloak` gets the config only and no `initOptions`: with `initOptions`,
keycloak-angular starts keycloak-js in an initializer of its own, in parallel
with this one, and only logs a failed login to the console.

`provideKeycloak` creates the keycloak-js instance when the application config
is evaluated, so the Keycloak URL, realm and client id must already be in
`window.env` (`assets/env.js`). Values that only arrive with the configuration
loaded after login do not reach it.

## Token refresh

The public client renews on demand: the interceptor checks `isTokenExpired()`
and calls `updateToken()` (minimum validity 20 s) before attaching. A failed
renewal still sends the request with the current token. There is no
`withAutoRefreshToken` and no inactivity timeout.

The confidential client schedules its own refresh 10 s before expiry, shares one
refresh request between concurrent callers and fails the request when the
refresh fails. On startup it keeps a stored token only if it is valid for at
least 10 more seconds.
