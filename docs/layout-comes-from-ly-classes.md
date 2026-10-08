# Layout comes from ly- classes

## Applies when

Writing or changing a template that lays elements out in rows or columns, or merging code from a branch that still
uses ngx-layout's `fx*` attributes (anything from `master` before the upgrade).

**Not this if**: the layout belongs to one component only and is clearer in its own stylesheet — plain component CSS
with `display: flex` is fine; the classes exist so converted templates render exactly as under ngx-layout.

## The classes

`src/layout.css` (global, after `styles.css` in `angular.json` for build and test) replaces @ngbracket/ngx-layout,
removed in 2026-10. All declarations are `!important`, because the inline styles ngx-layout wrote also beat
component CSS.

| ngx-layout | class |
|---|---|
| `fxLayout="row"` / `"column"` | `ly-row` / `ly-column` |
| `fxLayout.gt-xs="row"` | `ly-row-gt-xs` (with `ly-column`) |
| `fxLayoutAlign="<main> <cross>"` | `ly-align-<main>-<cross>`, e.g. `ly-align-end-center`, `ly-align-between-center` |
| `fxFlex` | `ly-flex` |
| `fxFlex="47"` etc. | `ly-flex-47`, `-30`, `-70`, `-80`, `-20`, `-85`, `-8px`, `ly-flex-third` |
| `fxFill` / `fxFlexFill` | `ly-fill`; with a `ly-flex*` class on the same element `ly-fill-flex` |
| `fxLayoutGap="8px"` | `ly-gap-8` |
| `fxFlexOffset="5px"` | `ly-offset-5` |
| `[fxShow]="x"` / `[fxHide]="x"` | `[class.ly-hidden]="!(x)"` / `[class.ly-hidden]="x"` |
| `fxHide.lt-md`, `fxHide.gt-sm` | `ly-hide-lt-md`, `ly-hide-gt-sm` |

A new size or alignment gets a new class in `layout.css`, not an inline style.

## What ngx-layout did implicitly

- A parent of an `fxFlex`/`fxFlexOffset` child without its own `fxLayout` became a flex row. Converted templates carry
  an explicit `ly-row` there; a new `ly-flex` child needs one too.
- `ly-flex-*` sizes along the parent's axis: `max-width` under a row, `max-height` under `ly-column`. The parent must
  carry the class; a direction set in component CSS is not seen.
- In a `mat-expansion-panel-header` the items sit in the projected `.mat-content`, which `layout.css` turns into a row.
- Breakpoints (600px / 960px) are screen-only; when printing, the defaults apply, as with ngx-layout.
- `fxShow`/`fxHide` hid an element only after the children's `ngAfterViewInit`. Where a child measures itself there
  (the flow designer's diagram editor), hide only after the view is initialised.

`ResponsiveService` uses the CDK `BreakpointObserver` with ngx-layout's ranges and alias names.

## Merging old code

Code from `master` with `fx*` attributes renders unstyled after the merge (the directives no longer exist, no error is
raised). Convert the attributes with the table above in the same merge.
