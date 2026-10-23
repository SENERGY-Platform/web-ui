# Content-review requests in the web-ui

## Applies when

Changing the Requests pages under `smart-services/requests`, the "Propose for publication" action of the smart
service releases, or the calls to the content-review service (state of the upgrade branch, 2026-10). What the
states and routes of the service mean is in `docs/requests.md` of the content-review repository.

**Not this if**: the change is about the review actions (test case, test, reject, publish) or the take-over into
platform-content. The pages show their status as plain fields only; the actions are not built here yet.

## Where it comes from

- The service URL is `environment.contentReviewUrl` (`CONTENT_REVIEW_URL`), kept in the three tracked files of
  `service-urls-live-in-three-tracked-files.md`. The Requests entry of the Smart Services section and the
  propose action depend on the Ladon rights for that URL: GET for the entry and the pages, POST for the action.
- `ContentReviewService` (`smart-services/requests/shared`) wraps the calls. Errors go through
  `ErrorHandlerService.handleError`, so a refusal shows the backend's message (`content-review: request failed
  (409): ...`); the call then answers `null` (or `[]` for the list).

## Pages

- **List** (`smart-services/requests`): own requests, newest first. Reviewers get the chip "All requests", which
  adds the author column and loads every request (`all=true`). The service answers no total, so the list reads
  all pages with `loadAllPages` and pages on the client. Row click opens the detail; the row menu offers Open and,
  for the author of a request in `in_review`, Withdraw.
- **Detail** (`smart-services/requests/:id`): read-only form page with Summary, Review status, Files and History
  (newest first). Withdraw is the header action for the author in `in_review`.
- **Reload**: while the state is transitional (`checking`, `moving`, `rejecting`, `withdrawing`, `publishing`), or the files job, the test or the take-over runs, the detail reloads
  every 5 seconds and stops once nothing runs or the page is left.
- **Files**: read only when `files.status` is `ready`, because the service answers 404 otherwise, and again only
  when `files.operation_id` changed. `.json` shows in the code editor as JSON, other text as plaintext, `.svg`
  additionally as an image through `core/svg-image.ts`. A deleted file and one without content show a short text.
  The service sends no old version, so there is no diff.

## Reviewer rule

`ContentReviewService.userIsReviewer()` is true for members of the group `/shared-resources-review` and holders of
the realm role `admin`, as in the service. It only decides what is shown; the service enforces it.

## Propose

The releases row menu offers "Propose for publication" for the latest release (no `new_release_id`) whose `creator`
is the current user, when Ladon allows POST. The dialog sends the test description (required, at most 10000
characters, counted as characters) and optional test parameters. The parameters are sent exactly as typed, because
the service stores every number as sent; the dialog only checks that the text is empty or a JSON object. On 201 it
closes and the page opens the new request; any refusal keeps the dialog open.
