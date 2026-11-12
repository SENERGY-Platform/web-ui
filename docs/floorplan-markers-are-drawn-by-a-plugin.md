# Floorplan markers are drawn by a plugin

## Applies when

Changing how a floorplan placement looks on the canvas: the pill with alias and value, its leader line, a coloured
area, or the text a marker shows. The markers live in `src/app/widgets/floorplan/`.

**Not this if**: the question is the floorplan's data (criteria, controls, commands) or the edit dialog's own preview
canvas in `shared/floorplan.model.ts`. The floorplan is a chart.js scatter chart; for the look of charts elsewhere
see `charts-draw-with-chart-js-in-two-looks.md`.

## The point is only a hit area

Each placed placement is a dataset with one point, but that point is transparent
(`floorplan.component.ts`, `transparentPoint`). Its radius (`dotSize`) is the hover and click area that opens the
tooltip and runs the row action. What is visible comes from the `floorplanMarkers` plugin in
`floorplan-chart-options.ts`, which draws in `afterDatasetsDraw` on the chart's own context.

The marker is not a `pointStyle` bitmap because chart.js draws a canvas `pointStyle` at the canvas's own width and
height in CSS pixels (chart.js 4.5.1, `drawImage(style, -w/2, -h/2, w, h)` in `helpers.dataset.js`). The device pixel
ratio is lost and icon and text turn soft on HiDPI displays. Drawn directly, they stay sharp, and the marker can carry
a ring and a shadow.

## What a marker is

`shared/floorplan-marker-draw.ts` draws a pill: a circle around the Material Symbols icon, widened to the right by the
text. The icon stays centred on the position however long the text grows. All proportions are shares of the marker
height (`dotSize`). Text and icon are white on a dark fill and near-black on a light one (`markerForeground`, by
luminosity).

The text (`markerText` in `shared/floorplan-markers.ts`) is the alias, the value or both joined by `': '`, each
switched per zoom state (`showAlias`/`showAliasWhenZoomed`, and the matching colouring entry's
`showValue`/`showValueWhenZoomed`). Without text the pill is the icon alone.

## Value reading

`shared/floorplan-markers.ts` turns messages into text:

- A boolean (`true`/`false` or the strings) reads as `On`/`Off`; a list reads per device, and only if every entry is a
  boolean (`stateLabel`).
- A placement whose criteria is the connection status reads as `Online`/`Offline` (`connectionLabel`), also in the
  tooltip.
- Anything else is the value with its unit appended when known.

## Labels avoid each other

`stackMarkers` in `shared/floorplan-marker-layout.ts` computes, per marker, how far its pill moves so no pill covers
another. The position never moves, only the pill:

- Markers are settled from the top down (by `y`). Each takes the nearest offset, tried in order of distance, that
  keeps it inside the chart area and clear of the pills settled before it, of the dots of all other markers, and of
  the labels of coloured areas. Offsets are steps of one pill height sideways (up to three) and about half a pill
  height vertically.
- A pill that cannot be freed stays on its position instead of being dropped, since a hidden value reads as a missing
  one.
- The candidate list depends only on pill height and area and is built once per draw, because the chart redraws on
  every hover.

A moved pill leaves its position marked by a dot with a leader line (`drawMarkerLeader`, shown unless
`coversPosition`). The leader is right-angled, down the column first and then across into the pill: leaders that all
run straight down would lie on top of each other, and a diagonal reads as part of the drawing. All leaders are drawn
before any pill, so a leader ends up under a neighbour's text.

## Areas

A placement may carry `zone`, three or more corners stored as fractions of the image, like `position`
(`shared/floorplan.model.ts`). Stored that way an area keeps its place when the widget is resized or the image
replaced. `hasZone` decides; fewer than three corners draws the pill as before, and `isPlaced` counts an area as
placed even without a position.

- `drawZone` (`shared/floorplan-zone.ts`) fills the polygon translucently in the value's colour, outlines it, and
  writes the text inside it with a halo instead of a pill. The areas are drawn first, so pills lie on top.
- The label sits at `zoneCenter`: the polygon's centroid, or for an L- or U-shaped room whose centroid lies outside,
  the middle of its widest stretch at that height. The chart point goes there too, so hovering the label opens the
  tooltip.
- The label's box (`zoneLabelBox`) is handed to `stackMarkers` as an obstacle; labels of areas never move.
- `zonePoints` and `placementPosition` return axis units: `drawShift` is stored relative to the chart area's corner,
  because the datasets are placed through the scales. Whatever draws on `chart.ctx` itself works in canvas pixels and
  adds `chartArea.left` and `chartArea.top` first, as the `floorplanMarkers` plugin does for the corners; without it
  the area sits up and to the left of its room by the chart's padding.

## Tooltip

The tooltip is an HTML element, not drawn on the canvas. It closes 200 ms after the pointer has left both the canvas
and the tooltip (`scheduleTooltipClose` in `floorplan.component.ts`, cancelled on `mouseenter`). The delay lets the
pointer travel from a marker onto the tooltip so its values and controls can be reached. While chart.js reports no
data points, the last tooltip is kept (`external` in `floorplan-chart-options.ts`), because clearing it would hand the
pointer back to the canvas and make it flicker.

## What guards this

Specs next to the code, in `src/app/widgets/floorplan/`: `shared/floorplan-marker-draw.spec.ts` (colour and pill
geometry), `shared/floorplan-marker-layout.spec.ts` (`stackMarkers`, `coversPosition`), `shared/floorplan-zone.spec.ts`
(corners, centre, label box), `shared/floorplan-markers.spec.ts` (value text, `On`/`Off`, `Online`/`Offline`) and
`floorplan.component.spec.ts` (transparent point, tooltip close timing, an area drawn at the image's pixels); `floorplan.component.zoneless.spec.ts` runs
the tooltip without zone.js.
