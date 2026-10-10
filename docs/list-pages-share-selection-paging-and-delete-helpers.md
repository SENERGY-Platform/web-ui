# List pages share selection, paging and delete helpers

## Applies when

Writing or changing a list page with a `mat-table`, a paginator, a header checkbox, single or bulk delete, or a success
or error snack bar. State of the upgrade branch (2026-10).

**Not this if**: the page is a card grid with infinite scroll (process repo, deployments, releases, designs) or deletes
through one batch call without a report (operator repo, waiting room, notifications, monitor, permissions list); those
keep their own code.

## The helpers

- `core/classes/list-selection.ts` `ListSelection<T>`: header checkbox logic over a `SelectionModel`. Default mode
  `'all'`: all rows selected counts as all, the toggle clears a full selection and otherwise selects every row; zero rows
  count as all selected. `mode: 'any'`: any selection up to the number of visible rows counts as all (operator and flow
  repository). `selectable`: only those rows count and get selected (export, import instances: rows the user may
  administrate). Pages expose `selection = listSelection.model` and keep `isAllSelected()`/`masterToggle()` as one-line
  delegates, so templates bind as before.
- `core/classes/paged-list-state.ts` `PagedListState`: page size from `PreferencesService`, offset, sort. `connect()`
  wires the paginator (page events write the page size preference); `reload()` sets offset and paginator back to page 1
  and drops the answer of a load that is still running; `sortChanged(event, remap)` maps column names to backend keys.
  Only read-only list loads go through it; writes stay in the page. Ready flags, total counts and query-param filters
  stay in the page.
- `core/services/delete-flows.ts`: `confirmDelete` emits once only when the delete dialog answered `true`.
  `bulkDelete` confirms, runs one job per selected item, judges the results with a success rule (`everyTrue`,
  `noneNullOrServerError`, or none when the service rethrows errors), reports with the page's own texts and reloads.
  Cancelling does nothing at all: no request, no flag change, the selection stays. A service that answers a failure with
  a fallback value must be given a success rule, otherwise the fallback counts as success. `countLabel(n, one, many)`
  builds "1 function" / "2 functions".
- `core/services/snack-bar-messages.ts`: `snackSuccess` (2 s, no action) and `snackError` (stays, `close`, error style).
  Calls with their own duration, label or position keep calling `MatSnackBar.open`. How they interact with the central
  HTTP error notice is in `docs/http-errors-name-the-backend-in-a-snack-bar.md`.

## Behaviour that is easy to break

- Server-paged lists return to page 1 on every reload from offset 0 (search, sort, reload after create or delete).
  Smart-service instances is the exception: it restores page and scroll from the URL and keeps its page on sort and
  refresh; only its page events go through the helper.
- Import instances waits for list and count together on reload, so rows never show with an outdated total.
- Device instances lets a reload replace a load that is still running; there is no `init && !ready` guard any more.
