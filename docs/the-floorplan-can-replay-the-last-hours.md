# The floorplan can replay the last hours

## Applies when

Changing the replay of the floorplan widget: the bar, where its values come from, which placements
take part, or what the map shows while a past moment is on screen.

**Not this if**: the question is how a marker or an area is drawn, which is
`floorplan-markers-are-drawn-by-a-plugin.md`, or how the current values are read - those come from
device commands in `refresh()` and have no history at all.

## Current values and history come from different services

The widget reads what a placement shows now with `DeviceCommandService.runCommands`, a group read
that knows only the present. The replay therefore goes to timescale-wrapper
(`ExportDataService.queryTimescaleV2`), which needs nothing the placement does not already carry:
its `deviceGroupId` and its `criteria` are a complete query element.

A placement without a measuring criteria is left out of the request rather than sent and ignored:
one faulty element makes the wrapper reject the whole request, so the connection status
(`fpCriteriaConnectionStatus`) and placements without a device group contribute no element and show
no value during the replay.

## Two elements per placement, because devices send rarely

`historyRequest` (`shared/floorplan-history.ts`) builds, per replayable placement:

- the grouped element, `groupTime` = the step, `groupType` from `groupTypeFor` - `mean` only when
  every colouring step is a number, `last` otherwise, since a switch state must not be averaged;
- an element without grouping for the newest value *before* the window (`limit: 1`,
  `orderDirection: 'desc'`, `time.end` at the first moment of the grid).

The second one is not a nicety. An event sensor writes a row when its value changes, so most buckets
of the grid hold nothing and the oldest reading inside the window may be younger than the window
itself. `historyFrames` carries the last known value across the gaps, and without the seed the first
moments would be empty although the room had a temperature the whole time. The measurement behind
this is in the vault under
`01 Plattform/Services/Event sensors leave a fixed time grid mostly empty.md`.

Answers carry `requestIndex` and come back in any order; `placementOfElement` maps them back. One
answer per device of a group, so a group gives an array ordered by device id and a single device its
bare value - the same shape the live read produces.

## The widget's model keeps the present

While a moment is shown, `draw()` takes its values from a copy of the placement (`shown()`), never
from `widget().properties`. Leaving the replay therefore costs a redraw, not a reload, and nothing
can write a past value into a widget that is later saved.

Three things are switched off for as long as a moment is on screen, all because the present and the
past must not be mixed on one map:

- `refresh()` returns early, or it would redraw the map with current values under an old timestamp;
- `standaloneControls()` answers nothing, so no control is offered - nothing can be switched in the
  past;
- the further tooltip criteria are skipped in `floorplan-chart-options.ts`, since they carry the
  present and would read as that moment's values.

## Where the bar lives

`floorplan-timeline/` holds the bar; it keeps only playing and speed, and the moment itself lives in
the widget (`frameIndex`), which is what lets the widget open the replay on its newest moment. The
bar lies over the map like the table of unplaced elements, so the drawing keeps its full size, and it
appears only in the maximised widget: a slider in a tile is a few pixels wide.

Whether a widget offers the replay at all, how far it reaches and how far apart its moments are, are
widget properties (`timeline`, `timelineWindow`, `timelineStep`). A long window rules out the short
steps: `timelineStepsFor` in the edit dialog offers only steps that keep the grid under
`timelineFrameLimit`, and `syncTimelineStep` moves a step the window no longer allows.

## What guards this

`shared/floorplan-history.spec.ts` (grid and rounding, carrying over gaps, the seed element,
`requestIndex` out of order, several devices, nothing built for a placement that cannot be replayed),
`floorplan-timeline/floorplan-timeline.component.spec.ts` (playing, speed, picking a moment),
`floorplan.component.spec.ts` under "a moment of the replay" (the value of the moment is drawn, the
model keeps the present, no controls) and `floorplan-edit-dialog.component.spec.ts` under "the replay
settings".
