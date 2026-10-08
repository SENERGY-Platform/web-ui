# The tenant themes share one mixin

## Applies when

Changing colours, sizes or typography of the app, adding a tenant, or writing a component style that needs a colour.
State of 2026-10-08 (Angular Material 22, M3 API, light only).

**Not this if**: the question is a chart colour. Chart series keep fixed colours; axes, grid and tooltips read the
theme through `core/charts/theme-color.ts` (see `charts-draw-with-chart-js-in-two-looks.md`).

## Structure

- `src/themes/_base.scss` holds the whole theme as `@mixin theme(...)`, built on `mat.theme()`.
- Each of the seven bundles in `angular.json` (`senergy.scss`, `indigo.scss`, `smartador.scss`,
  `smartador-internal.scss`, `lll.scss`, `optimise.scss`, `platonam.scss`) only calls that mixin with its palettes and
  its old colours. indigo and both smartador bundles use the senergy palette.
- `_palette-<tenant>.scss` are tonal palettes generated with `ng generate @angular/material:m3-theme` from the tenant's
  brand (primary), sidenav (tertiary) and warn colour. `_palette-neutral.scss` is an achromatic neutral pair merged
  into every tenant, so greys stay grey instead of taking on the brand hue.

## The look stays the M2 look

The mixin deliberately reproduces the pre-M3 appearance where layouts depend on it:

- `$brand`, `$sidenav` and `$warn` pin `--mat-sys-primary`, `-tertiary` and `-error` to the tenant's exact old hex;
  M3 would use the darker tone 40. `$on-brand` is white except for optimise (black).
- Templates still say `color="accent"` for the brand colour. The compatibility classes map accent to primary,
  `color="primary"` stays neutral (dark label), buttons without `color` get dark labels too.
- Page and surface are white, the error snack bar is dark red, tab groups with `backgroundColor="accent"` are filled.
- Component sizes are the M2 ones (36px buttons, 48px icon buttons, button toggles and tree rows), set through
  `mat.*-overrides`.
- `<body class="mat-typography">` gets the M2 type hierarchy; the M3 one would change every heading size.
- The `mat-elevation-z*` shadow tokens come from Material's elevation module, which is not public API; check it after
  a Material update.

M3 shapes (pill buttons), tonal surfaces of fields and chips and the underline tab strip are taken over as they are.

## Colours in component styles

Use the system tokens, not literals: `--mat-sys-on-surface` / `-on-surface-variant` for text, `-outline-variant` /
`-outline` for borders, `-surface*` for fills, `-primary` / `-on-primary` for brand, `-error` for errors. Colours
that mean a state in every tenant use `--app-status-ok|failed|warning|unknown|error` from `_base.scss`.

There is no dark mode (decided 2026-10-07). `$theme-type` exists, but only `light` is used.
