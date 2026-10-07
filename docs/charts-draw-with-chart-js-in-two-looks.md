# Charts draw with chart.js in two looks

## Applies when

Changing or adding a chart anywhere in the app: a widget, a dialog, the environment previews. Every chart is drawn
with chart.js 4 through ng2-charts; there is no second chart library.

**Not this if**: the question is about the data a widget fetches (export queries, analytics endpoints). This document
covers how prepared data becomes a chart, not where it comes from.

## Two looks, one library

The charts kept the look of the library they used to be drawn with:

- **Google look** (`src/app/core/charts/google-*.ts`): the former Google Charts widgets — charts export line, scatter,
  pie and zoom view, pv prediction, reconstruction, device downtime and gateway charts, process deployments and
  instances. `google-look.ts` holds palette, font sizes by chart size, value ticks and number formats;
  `google-chartjs.ts` the frame, axes plugin and focus/selection; `google-tooltip.ts`, `google-pie.ts`,
  `google-columns.ts`, `google-lines.ts` the rest. The zoom view is a replica of Google's AnnotationChart in
  `widgets/charts/export/annotation-chart/`.
- **Apex look** (`src/app/core/charts/chart-look.ts`, `chart-tooltip.ts`, `time-ticks.ts`): the former ApexCharts
  charts — environment profile and schedule previews, the shared timeline and its hosts, consumption profile, leakage
  detection, bad ventilation, anomaly line. `time-ticks.ts` reproduces Apex's tick choice by range.

A new chart takes the look of the widgets around it.

## Data modules stay library-neutral

Each chart has a data module that turns the widget's data into series, labels, colours and formatted strings, and a
separate `*-chartjs.ts` adapter that builds the chart.js config from it. Specs assert on the data module's output
(values, colours, formatted text), not on chart.js options, so a look change does not rewrite the specs.

## Registration lives at root

`provideAppCharts()` (`core/charts/provide-app-charts.ts`) registers the chart.js controllers, the zoom and
annotation plugins and the date-fns date adapter. It is provided in `CoreModule`, because dialogs opened through the
root `MatDialog` draw outside the lazy modules. A chart that resizes from a `ResizeObserver` callback redraws inside
`NgZone.run`, since zone.js does not patch the observer.

## Dates and durations

- The stored axis format (`hAxisFormat`) is read as Unicode tokens by every chart, the same way Google Charts read it.
  `charts-export-chartjs.ts` translates formats written for moment (`DD`, `YYYY`, `ddd`, `L…`, `A`, `[text]`) so they
  render as before; a format date-fns cannot use falls back to `d. MMMM yyyy HH:mm`.
- Durations go through `core/time/iso-duration.ts` and `humanize-duration.ts`, which copy moment 2.30's parsing,
  carry rules, `toISOString` and humanize thresholds, because stored BPMN timer and deployment durations were written
  with moment.
