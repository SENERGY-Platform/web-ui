# Service URLs live in three tracked files

## Applies when

Adding, renaming or removing a service URL in this app. Service URLs reach the
app as **runtime** environment variables, not as build-time constants.

**Not this if**: you found the key in `src/assets/env.json`,
`src/environments/environment.dev.ts` or `environment.prod.ts` and want to edit
it there. Those are generated and gitignored — see below.

## The two places

Adding or removing one URL touches two tracked files. Miss one and the app falls
back to `http://localhost` at runtime, which looks like a deployment problem
rather than a missing edit:

- `src/environments/environment.ts` — declares the key and reads it from
  `window.env`, with a `http://localhost` fallback
- `src/assets/env.template.json` — the template the deployment fills with real
  values

`environment.ts` is also where the **production** build gets the key from:
`build/Dockerfile` generates `environment.prod.ts` from it with a single `sed`
that flips `production: false`. So a key added to `environment.ts` is
automatically in the file `fileReplacements` swaps in, and there is nothing else
to keep in sync for the build.

## `set-env.ts` is not part of the chain

`set-env.ts` looks like the renderer that fills the template, and this document
listed it as a third required file until 2026-09-01. **Nothing invokes it** — not
`package.json`, not `.github/workflows/`, not `angular.json`, not `build-env.sh`
or `build-env.cmd`. Its own header comment still describes a manual
`ts-node set-env.ts --environment=dev`.

Editing it is therefore harmless and pointless; skipping it breaks nothing. The
file is tracked, so a `grep` for a URL key finds it and suggests otherwise.

## The generated files are not the source

`src/assets/env.json`, `src/environments/environment.dev.ts` and
`environment.prod.ts` carry the same values but are **gitignored** — they are
generated. A grep that still finds the key there after an edit is not a sign the
removal failed. Checking those first is the usual detour.

Who generates which:

- `src/assets/env.json` — `build-env.sh`, from `env.template.json` via `envsubst`.
  In the container this runs at **start**, not at build time (see the `CMD` in
  `build/Dockerfile`), which is why a new key needs a redeploy and not a rebuild.
- `src/environments/environment.prod.ts` — the `sed` in `build/Dockerfile`.
- `src/environments/environment.dev.ts` — locally, by hand or by an older
  workflow; nothing in the repository writes it today.

## The hardcoded permission list

`ladon.service.ts` holds a `serviceEndpoints` list of URLs whose authorizations
are checked against Ladon at startup. It is separate from the two files above
and easy to forget:

- a new service URL missing there gets **no permission preflight**
- a removed one leaves a **dead check** behind

Neither fails loudly, which is why this list belongs in the same change as the
three files.
