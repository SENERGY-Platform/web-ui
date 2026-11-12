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
  `device-repo is not reachable` for status 0. When the error body carries a
  message (a string body, or a string `error` or `message` field), it is
  appended trimmed and cut at 200 characters:
  `device-repo: request failed (400): name already taken`. The backend is the
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

The snack bar shows one message at a time and a new one replaces the open one.
`snackSuccess` and `snackError` (`snack-bar-messages.ts`) and the central
handler therefore share the state of the open error snack bar:

- `snackSuccess` does not open while an error snack bar opened less than 1500 ms
  ago is still open, so a success message after a failed call cannot hide the
  error. An older open error, for example from a polling widget, does not block it.
- `snackError` within that window after the central text opens one merged snack
  bar, `<component text> (<central text>)`, instead of replacing it. The central
  handler merges the same way after a component error. The dedupe above still
  holds after a merge.

A service that answers a failure with a fallback must not let its caller report
success: the caller checks the fallback (`null`, `false`, `isSuccess` in
`bulkDelete`) and reports an error itself. `bulkDelete` without `isSuccess`
counts any emitted result as success and only an error as failure.

## Choosing

Default to `handleError`. Switch a call to `handleErrorQuietly` when the user
cannot act on the failure because nothing is wrong, and say why in the review.
A failure that hides rights or data the user expected (permissions, history)
keeps the snack bar, so the user learns why a button or chart is missing.

## A denied endpoint reports as a broken backend

The same snack bar appears when nothing is broken and the account simply may not
call that endpoint. The text then reads `device-repo: request failed (403)` and
sends the reader looking for an outage. It is the most common way a read-only
account meets this handler, because the caller has a fallback and the view
renders — the snack bar is the only visible effect.

Two shapes produced it on the dashboard of an account that may read devices but
write nothing:

- A **query route**. The device repository answers both
  `POST /query/functions` and `GET /functions?ids=…`; the floorplan asked over
  the first, which an account without write rights is denied. Prefer the listing
  route wherever one exists, and pass the ids rather than fetching the first
  page of everything (`DeviceGroupsService.getFunctionListByIds`).
- A **second service the account has no rights on**. The aspect nodes of a
  device dialog are collected from the devices *and* from the import types, so a
  method about device metadata reached the import repository
  (`DeviceTypeService.listImportTypeCriteria`).

For the second shape, gate the call on the right instead of reporting its
failure: `importTypesService.userHasReadAuthorization()` answers from the
authorizations Ladon prefetched at startup, which is the same source the sidenav
uses to decide whether to show the section at all. A call that is skipped costs
nothing and says nothing; a 403 that is caught and reported says the wrong
thing.

`handleErrorQuietly` is not the fix here. It hides the failure from the user but
still spends the request, and for a whole class of accounts the request can
never succeed.
