# Verification without a build

## Applies when

Checking a change in this app without running the Angular builder — the usual
case while iterating, where a full build costs more than the feedback is worth.

**Not this if**: the change has to be *seen* — layout, a Material component's
rendered structure, anything visual. None of the commands below render anything,
and the third one type-checks templates but says nothing about how they look.

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
