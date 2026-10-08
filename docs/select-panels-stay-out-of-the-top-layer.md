# Select panels stay out of the top layer

## Applies when

An `mtx-select` panel is hidden, clipped or behind a dialog, or `@ng-matero/extensions` is upgraded. State of
matero 22.1.1 with @ng-matero/ng-select 1.2.1 (2026-10).

**Not this if**: a native `mat-select` misbehaves — it opens through the CDK overlay, not through ng-select.

## The setup

`core/overlay-defaults.ts` (`provideOverlayDefaults()`, provided in `AppModule` and the preview module) sets two
defaults:

- `OVERLAY_DEFAULT_CONFIG` `{ usePopover: false }`: CDK overlays (dialogs, menus) stay out of the browser's top layer.
- `MTX_SELECT_DEFAULT_OPTIONS` `{ usePopover: false, appendTo: 'body' }`: select panels are plain elements in the body.

Most selects in dialogs set `appendTo=".ng-select-anchor"`, an element in `index.html`. Nothing outside the
top layer can stack above a popover, so if either side switched to popovers, select panels would open behind dialogs.

## What matero 22 changed

- `usePopover` defaults to `true`; without the default above every select panel would be a popover.
- A select without `appendTo` renders its panel inside the form field, whose `overflow: hidden` clips it to nothing.
  matero 21 put it into the body; `appendTo: 'body'` restores that for every select, including new code.
- Template directives are renamed: `ng-label-tmp` -> `ngSelectLabel`, `ng-option-tmp` -> `ngSelectOption` (and the
  other `ng-*-tmp`).
- ng-select's CSS classes are renamed: `ng-value-label` -> `ng-select-value-label`, the remove icon
  `ng-value-icon` -> `ng-select-value-remove`, `ng-dropdown-panel` -> `ng-select-panel`, `ng-option` ->
  `ng-select-option`. A custom label template with the old names loses its styling silently.
- A right click no longer opens a select. Kept as is (decided 2026-10-07).
