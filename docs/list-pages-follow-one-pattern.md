# List pages follow one pattern

## Applies when

Writing or changing a routed page that lists objects in a table (state of the upgrade branch, 2026-10). The
selection, paging and delete helpers behind it are in `list-pages-share-selection-paging-and-delete-helpers.md`.

**Not this if**: the page is an editor canvas, a tree with a detail form, a dashboard or a form page. Those
classes get their own pattern; a list never invents its own variant.

## Building blocks

- `senergy-page-header`: title, one sentence saying what the object is, actions on the right. The create
  action is a filled button "New <noun>", shown only with the page's own create right; Import and Export are
  outlined next to it. No FAB.
- `senergy-list-toolbar`: compact search (global `SearchbarService`), filters in `[toolbarFilters]` (a
  "Filter" outlined button for a filter dialog, active filters as removable chips, toggles such as "Show
  generated" as chips). While rows are selected a selection bar with `[bulkActions]` replaces the row; both
  stay in the DOM because destroying the searchbar resets the search text.
- `senergy-empty-state`: "No <noun> yet" without filters, "No matching <noun>" while a search or any filter
  (including the generated filter) is active, "No access" without the read right.
- Global styles in `src/themes/_design.scss`: `.page-body`, `.list-card` (tables inside use header 44 / row
  52 px, others keep 48), `.clickable-row`, `.name-cell`, `.muted`, `.num`, `.type-chip`, `.status-chip`
  (`online`, `warning`, `failed`), `.name-chip`, `.select-column`, `.actions-column`, menu item `.danger`.

## Rules

- Row click opens: the page, or the edit dialog where editing is a dialog, read-only without the right to
  change that row. Every other action sits in the row menu in a fixed order: Open/Edit or Details, domain
  actions, Share, Delete (`.danger`) last.
- Without the right for a row an action is hidden, not disabled. No right check is added where the page had
  none: Ladon may grant a method only on sub-paths of a service URL, so probing the base URL hides actions
  from users who may use them.
- The selection column exists only when a bulk action is permitted.
- Refresh: the toolbar's refresh button only emits `(refresh)`; every list binds it to its reload, so one
  click loads exactly once. It reloads what is shown (a single-instance view reloads that instance).
- Paginator on every list, sort by column headers. APIs without a total are read with `loadAllPages`
  (`core/classes/load-all-pages.ts`) and paged on the client; every reload, sort and page change goes
  through the filtered rows.
- Columns: selection, name first (description as a muted second line), then chips, data and counts
  (right-aligned), dates last, row menu. A visual identifier (flow preview) may precede the name.
- Dates: `LIST_DATE_FORMAT` (`core/classes/list-date-format.ts`, `dd.MM.yyyy HH:mm`), muted, headers
  "Created" and "Updated".
- Tab groups are left-aligned (Material tabs default in `core/form-field-defaults.ts`).
- Stored user content is never inserted as trusted HTML; a stored SVG is shown as an `<img>` with a
  `data:image/svg+xml` URL (see flow-repo `previewUrl()`).
