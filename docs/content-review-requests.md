# Content-review requests in the web-ui

## Applies when

Changing the Requests pages under `smart-services/requests`, the "Propose for publication" action of the smart
service releases, the review actions on the detail page, or the calls to the content-review service (state of the
upgrade branch, 2026-10). What the states and routes of the service mean is in `docs/requests.md` of the
content-review repository.

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
- **Detail** (`smart-services/requests/:id`): form page with Summary, Test case, Review status, Take-over, Files and History
  (newest first). Header actions in this order: Publish (filled), Reject, then Withdraw (author, `in_review`).
- **Reload**: while the state is transitional (`checking`, `moving`, `rejecting`, `withdrawing`, `publishing`), or the files job, the test or the take-over runs, the detail reloads
  every 5 seconds and stops once nothing runs or the page is left.
- **Files**: read only when `files.status` is `ready`, because the service answers 404 otherwise, and again only
  when `files.operation_id` changed. `.json` shows in the code editor as JSON, other text as plaintext, `.svg`
  additionally as an image through `core/svg-image.ts`. A deleted file and one without content show a short text.
  The service sends no old version, so there is no diff.

## Review actions

Shown only to reviewers, only in `in_review` and only while nothing runs (files job, test, transfer, any running
operation); otherwise hidden. The service enforces the same and answers 409 while something runs. Every write
reads the request again, also after a refusal, whose message the central handler shows; nothing is retried, and the
reload restarts the polling until nothing runs.

- **Test case**: the stored `test_case` in the JSON editor, editable for reviewers, read-only for everyone else.
  Changes are saved through the save bar (`PUT /requests/{id}/test-case`). The text is sent as typed, after the page
  checked that it is a JSON object of at most 65536 bytes without whitespace between tokens
  (`shared/test-case.ts`); text equal to the stored one does not enable Save. Unsaved edits survive the polling
  reload and are dropped when the reviewer may not edit any more. "Remove test case" sends `null` after a
  confirmation. A changed test case resets the test, which the page says. The key names in the hint are those of
  the test case format in `docs/tests.md` of platform-content.
- **Start test** (`POST .../test`), in Review status, once a test case is stored and the editor has no unsaved
  changes. 409 means another request is being tested, because all requests share one review test account.
- **Make files again** (`POST .../files`), in Files: reads staging again after the author changed something.
- **Reject** (`POST .../reject`): dialog with the required reason, at most 10000 characters (counted as characters).
  The state goes to `rejecting` and the polling follows it to `rejected`.
- **Publish** (`POST .../publish`): only with a stored test case and `test.status` `passed`; the confirmation
  names the smart service and says it moves to shared-resources-prod for all users.

## Take-over

The section "Take-over" of the detail page shows when the state is `published` or `sync.status` is not `none`. It
holds the status with time and detail, the commit whenever there is one (or "Nothing changed." for `synced` without
one) and the list of `sync.files` with a change chip each. A line above the list says whether it is the files the
preview found (`previewed`), the files written (`synced`) or those of a failed run, which the service keeps so that a
push that happened still shows; the execute pulls again, so preview and take-over can differ. An empty preview says
"No files would change.", and `truncated` adds a notice that more files are affected than shown.

Two actions, shown only to reviewers, hidden otherwise, and only while nothing runs (`reviewRequestSyncable`: `published`, a
stored test case, no running job, test, take-over or operation):

- **Preview take-over** (`POST .../sync`): no confirmation, it writes nothing.
- **Take over** (`POST .../sync/execute`): only after a preview (`sync.status` `previewed`). The confirmation names the
  smart service and the number of files of the preview and says they are committed to `main` of platform-content,
  from where the content jobs take them up; after a preview without changes it says that nothing is committed.

Both read the request again, also after a refusal; the polling follows `previewing` and `syncing`.

## Reviewer rule

`ContentReviewService.userIsReviewer()` is true for members of the group `/shared-resources-review` and holders of
the realm role `admin`, as in the service. It only decides what is shown; the service enforces it.

## Propose

The releases row menu offers "Propose for publication" for the latest release (no `new_release_id`) whose `creator`
is the current user, when Ladon allows POST. The dialog sends the test description (required, at most 10000
characters, counted as characters) and optional test parameters. The parameters are sent exactly as typed, because
the service stores every number as sent; the dialog only checks that the text is empty or a JSON object. On 201 it
closes and the page opens the new request; any refusal keeps the dialog open.
