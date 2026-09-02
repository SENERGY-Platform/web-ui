# Verification without a build

## Applies when

Checking a change in this app without running the Angular builder — the usual
case while iterating, where a full build costs more than the feedback is worth.

**Not this if**: the change has to be *seen* — layout, a Material component's
rendered structure, anything visual. None of the commands below render anything,
and the third one type-checks templates but says nothing about how they look.
Measuring it in a spec does not close that gap either — see below.

## Three commands

```bash
npm test
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json
./node_modules/.bin/ngc --noEmit -p tsconfig.app.json
```

- `npm test` — Karma suite via ChromeHeadlessCI, around 620 specs, well under a
  minute. `--include='**/some/path/*.spec.ts'` narrows the bundle when the whole
  suite is more than the change needs.
- `tsc --noEmit` — fast type check of the app without emitting and without
  invoking the Angular builder. TypeScript only; it does not read templates.
- `ngc --noEmit` — the Angular compiler, same project file. It **does** check
  templates, under the `strictTemplates` this repo enables, and still does not
  bundle. It is the slowest of the three and the only one that catches a wrong
  input name, a missing module import, or a binding whose type does not fit.

None replaces the build for a release; all three are cheap enough to run on every
change, which is the point.

## `ngc` is what catches a template error

A property binding whose value type is wrong — `[step]` given a number where the
DOM property is a string, an input bound to `string | undefined` where the
component declares `string` — is invisible to `tsc` and to the test suite unless a
spec happens to render that template. `ngc` reports it with the template file and
line, plus the component whose template it is.

Worth knowing that it really runs: pointing a binding at a property that does not
exist should fail. If a clean `ngc` run is treated as proof, verify once that it
can fail at all — a typo in a template is the cheapest way.

```
src/app/.../some.component.html:17:29 - error TS2339: Property 'titleTypo'
does not exist on type 'SomeDialogData'.
```

## A spec can render, but it cannot measure

`npm test` renders real DOM, so `getBoundingClientRect()` returns numbers and an
alignment assertion looks like verification. It is not one: the `test` target
lists no `styles`, so only each component's own `styleUrls` are bundled and
Material's theme never applies. A `mat-icon-button` has no fixed 40px box there
and collapses to its content — 16px for the empty placeholders this app uses to
keep columns aligned, 40px once the theme is in.

Two rows differing only in whether their spacer holds an icon therefore measure
24px apart in the suite and zero apart in the app. Nothing about the failure says
the measurement is unfounded: the numbers are real and reproducible, and they
describe a stylesheet nobody loaded. The tell is to measure something known to be
correct as a control — if that disagrees too, the yardstick is the problem.

What does hold in a spec is structure. For alignment, the run of siblings in
front of an element is what decides where it starts, and comparing that is
theme-independent:

```ts
expect(tagsBefore(groupField)).toEqual(tagsBefore(aspectField));
```

Anything genuinely visual needs the app.

## The full suite is the CI's job, not necessarily yours

`npm test` bundles all ~101 spec files into one Chrome renderer, and that bundle
is the single most memory-hungry thing this repository asks of a machine. On a
constrained one it aborts with `FATAL ERROR: Reached heap limit` before a single
spec runs — which looks like a broken suite and is not one.

`.github/workflows/test.yml` runs exactly that suite on every push, with
`--browsers=ChromeHeadlessCI` and an 8 GB heap. So the division is:

- **locally** — `--include='**/<path>/*.spec.ts'` over the specs the change can
  reach, plus `tsc --noEmit` and, for a template change, `ngc --noEmit`. Fast
  enough to run repeatedly, and narrow enough to fit.
- **on the push** — the full suite, as a gate that cannot be skipped by
  forgetting it.

A local abort is therefore a reason to say which specs you did run, not a reason
to claim the change is unverified. What it is never a reason for is widening the
local run until it fits: two Angular builds at once, or one with a raised heap
ceiling, is how the machine goes down instead of the command.
