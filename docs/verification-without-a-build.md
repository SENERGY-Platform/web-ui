# Verification without a build

## Applies when

Checking a change in this app without running the Angular builder — the usual
case while iterating, where a full build costs more than the feedback is worth.

**Not this if**: the change touches templates in a way only the builder
resolves. The type check below is template-independent by design and will not
catch those.

## Two commands

```bash
npm test
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json
```

- `npm test` — Karma suite via ChromeHeadlessCI, around 620 specs, well under a
  minute.
- `tsc --noEmit` — fast type check of the app without emitting and without
  invoking the Angular builder. Catches template-independent errors between test
  runs.

Neither replaces the build for a release; both are cheap enough to run on every
change, which is the point.
