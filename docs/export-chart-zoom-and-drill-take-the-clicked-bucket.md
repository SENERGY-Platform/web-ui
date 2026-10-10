# Export chart zoom and drill take the clicked bucket

## Applies when

Changing the x-label zoom, the column drill-down, the drill or zoom view state, or the empty message of the export chart
widget (`widgets/charts/export`). State since 2026-10-10 (master v0.42.2, ported to the upgrade branch).

**Not this if**: the chart shows wrong values without any click; that is the data preparation in
`shared/charts-export-table.ts` or the backend query, not the interaction.

## X-label zoom

- `clickedBucket(tick, dataTimes, groupTime)` in `chartjs-bucket-gaps.ts`: `from` is the data timestamp under the clicked
  tick, which is the bucket start the backend returned; ticks within 1 ms of a data point count as that point, because
  chart.js pads a single point by 1 ms on each side. `to` is `from` plus the grouping (local calendar for d/w/months/y,
  milliseconds below), or the next data timestamp when it lies within an hour of that end (keeps UTC-aligned buckets
  exact across daylight-saving days).
- Charts without grouping (`group.type` empty) keep the old tick-to-next-tick zoom on every click.
- Weekly charts zoom into the days of the clicked week. Zoom-out starts at the first of the month or year.

## Column drill

Each table column carries the index of the vAxis it came from (`columnAxes` on the chart model, kept through the period
split and the column sort). `drillable`, `drillDown` and the y-axis mapping use it, never the dataset index directly:
an axis without data has no column, a group or location axis yields one column per device and service, and the period
comparison adds columns.

## View state

Zoom (`_groupTime`, `_hAxisFormat`, `_from`, `_to`) and drill (`_modifiedvAxes`, `_drillStack`, `_chooseColors`,
`_stacked`) live in local storage per widget id. `disableBreaking` is derived from the drill stack, so a reload in a
drilled state does not re-apply the period comparison. When the dashboard updates a widget, `cleanupStaleViewState` drops
only the keys the new configuration contradicts, compared by meaning (key order ignored, `null`/`undefined`/`''` as
unset); a rename keeps both. The maximized view works on its own copy of the chart data and handles its own clicks.

## Empty charts

A `difference-*` grouping needs a value in the interval before the first bucket; without it the backend answers no rows.
The empty message then reads "No data. A difference also needs a value in the interval before."; all other empty
charts keep "No data".
