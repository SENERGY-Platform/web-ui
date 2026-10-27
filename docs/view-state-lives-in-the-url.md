# View state lives in the URL

## Applies when

Writing or changing a routed page whose view the user adjusts: search, filters, toggles, sort, page, selected tab.
A reload or a shared link has to show the same view (SNRGY-5024).

**Not this if**: the state is a user preference that should follow the user to every visit (page size in
`PreferencesService`). The "show generated" toggles kept in `localStorage` stay there as well; the URL value wins when
it is present, the stored value is the default when it is not.

## The pieces

- `core/services/url-state.service.ts` `UrlStateService`: `get`, `getAll`, `getBoolean`, `getShown`, `getInt`,
  `getPage`, `getSort` read the current query parameters; `set`, `setPage`, `setSort` write them. Writes merge,
  replace the history entry, go out as one navigation per tick, wait for a running navigation and are dropped once the
  page was left. `null`, `undefined`, `''`, `false` and `[]` remove a parameter, so a page passes a default as `null`.
- `senergy-searchbar` keeps `search` in sync by itself. A page with a searchbar does nothing for the search text.
- `core/classes/paged-list-state.ts` `PagedListState` with the option `urlState` carries the rules below for sort and
  page: it restores both when it is created (with `remap` for column names whose backend key differs), writes `page`
  on every page event and the sort in `sortChanged`, and its first `reload()` is the opening load that keeps the page
  from the URL; every later `reload()` returns to page 0 and writes it. A page on `PagedListState` passes
  `urlState`, binds `[pageIndex]="list.pageIndex"` and does nothing else for sort and page.

## Keys

| Key | Meaning |
|---|---|
| `search` | search text, written by the searchbar |
| `sort`, `dir` | sort column and `asc`, `desc` or `none`; absent at the page's default |
| `page` | zero-based page index; absent on the first page |
| `tab` | zero-based index of the selected tab; absent on the first tab |
| `generated`, `hidden` | `show` or `hide`, read with `getShown`, the same meaning on every page |

Filters keep their existing keys (`hubId`, `concept_ids`, `device-type-id`, ...). New filters get a short kebab-case
key named after what they filter (`user`, `role`, `month`, `concept_id`).

## Rules

- Restore before the first load: read sort, page and filters in `ngOnInit` into the fields the load already uses, set
  `offset = pageSize * pageIndex`, and bind `[pageIndex]` on the paginator next to `[pageSize]`. Sort is restored
  through the existing `[matSortActive]`/`[matSortDirection]` bindings; where a page has none, add them.
- The first emission of `SearchbarService.currentSearchText` is the search the page was opened with. It loads with the
  restored page; every later emission is a new search and returns to page 0 (`setPage(0)`).
- A sort change calls `setSort(event, defaultActive, defaultDirection)`, which also drops `page`. A page event calls
  `setPage(pageIndex)`. A reload that returns to page 0 calls `setPage(0)` and resets the paginator through the
  `[pageIndex]` binding.
- A filter or toggle change writes its own key and `page: null` in one `set` call.
- A toggle whose default comes from `localStorage` is always written, `show` or `hide`: a removed parameter would fall
  back to the stored value of whoever opens the link, not to the view the link was taken from.
- A page that subscribes to `ActivatedRoute.queryParamMap` reacts only to its own keys. Every write of the searchbar or
  another state key emits there too; a handler that reloads or re-subscribes on any emission loads twice or leaks.
  Compare the page's own keys with the previous values and return when they did not change (see the deployments page).
- A page that writes query parameters itself merges (`queryParamsHandling: 'merge'`, removed keys as `null`) or goes
  through `UrlStateService.set`. Replacing all parameters drops `search`, `sort` and `page`.
- A server-paged paginator carries `senergyKeepPageInRange` (`core/directives/keep-page-in-range.directive.ts`): a
  page from the URL beyond the end of a list that has become shorter moves to the last page through a page event, so
  the page's own handler loads it and writes `page`. It needs the list's total in `[length]` also for an empty page,
  and a length of 0 until the first answer: a placeholder total moves the page before the list has loaded.
- A toggle shown as `mat-chip-option` reports a `[selected]` value restored from the URL as a selection change; its
  handler returns when the value did not change, or the page loads twice.
- Client-side tables (`MatTableDataSource` with `.paginator`/`.sort`) restore the paginator's `pageIndex` once the
  data is in, since the data source moves a paginator beyond the last page back to the last page.
- A page with tabs keeps page and sort per tab: only the selected tab's table takes `page`, `sort` and `dir` from the
  URL and writes them, and the load reads them from the page's own fields, not from the table. A tab switch writes
  `search`, `sort`, `dir` and `page` as `null` in the same `set` as `tab` and loads the new tab from the defaults. The
  toolbars bind `[searchTextIn]="searchText"`, so the cleared search shows in the searchbar of every tab, which all
  exist from the start.
- Infinite-scroll lists have no page parameter. Their `senergy-sort` dropdown keeps `sort`/`dir` too: the page
  restores its sort attribute (value and order) and passes it as `[selectedValue]`.
