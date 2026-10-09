# HTTP errors name the backend in a snack bar

## Applies when

Writing or changing a service method that calls `HttpClient` and answers its
caller with a fallback value on failure, through `ErrorHandlerService`
(`src/app/core/services/error-handler.service.ts`).

**Not this if**: the method has no `catchError` and lets the error reach the
component, or has its own `catchError` that inspects the status (the 304 cache
in `DashboardService`, the 404 and 409 handling in `EnvironmentsService`).
Those report, or deliberately do not report, on their own.

## Three handlers

All three log the error and answer with the fallback value, so the caller sees
the same value as before. They differ only in what the user sees:

- `handleError(service, method, fallback)` opens an error snack bar naming the
  backend and the status: `device-repo: request failed (503)`, or
  `device-repo is not reachable` for status 0. The backend is the
  `environment` key whose URL is the longest prefix of the request URL, without
  its `Url` suffix and in kebab case; without a match it is the host. The text
  leaves out the HTTP status text on purpose: over HTTP/2 there is none and
  Angular fills in `OK`.
- `handleErrorQuietly(...)` only logs. Use it where a failure is a normal
  outcome: an existence check before create (`ProcessIoService.get`), a lookup
  where unknown input is expected (`DeviceInstancesService.shortIdToUUID`), a
  poll where 404 means "not running" (`EnvironmentsService.getEnvironmentState`),
  a background refresh (the waiting room badge via `searchDevices(..., quiet)`),
  or data that may be gone (`PermissionsService.getUserById` for deleted users).
- `handleErrorWithSnackBar(message, service, method, fallback)` shows the
  caller's own text instead of the generated one, and only that.

Only an `HttpErrorResponse` produces a snack bar. Any other error caught by the
same `catchError` (a `TypeError` in a `map`) is logged as before.

While a snack bar with the same text is open, the same failure does not open it
again; polling widgets against a dead backend would otherwise flood it. After
the user closes it, the next failure opens it again.

## Choosing

Default to `handleError`. Switch a call to `handleErrorQuietly` when the user
cannot act on the failure because nothing is wrong, and say why in the review.
A failure that hides rights or data the user expected (permissions, history)
keeps the snack bar, so the user learns why a button or chart is missing.
