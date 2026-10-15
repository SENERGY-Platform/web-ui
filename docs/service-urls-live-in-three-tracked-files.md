# Service URLs live in three tracked files

## Applies when

Adding, renaming or removing a service URL in this app, or a function, aspect or
device class id. Both reach the app as **runtime** environment variables, not as
build-time constants.

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

## Function and aspect ids take the same route

Ids of functions, aspects and device classes are keys in the same two files. Their
fallback in `environment.ts` is a placeholder such as
`urn:infai:ses:aspect:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`, and `loadEnv` in
`initializer.service.ts` skips an empty value. A deployment that does not set the
key therefore leaves the placeholder in place: it matches no content variable and
no criteria, so a widget built on it finds nothing and reports no error.

The placeholder is the same string for every key of one kind. A spec that tells
two functions or two aspects apart has to set distinct values for them first, as
the `ac-control` specs do, or both compare equal.

## There is no third renderer

The template is filled by `build-env.sh` (`build-env.cmd` on Windows) and the
production file by the Dockerfile `sed`. An old `set-env.ts` that looked like a
renderer was removed; nothing invoked it.

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

`src/app/modules/admin/permissions/shared/services/ladom.service.ts` (class
`LadonService`; the file name is spelled with an m) holds a `serviceEndpoints`
list of URLs whose authorizations are checked against Ladon at startup. It is separate from the two files above
and easy to forget:

- a new service URL missing there gets **no permission preflight**
- a removed one leaves a **dead check** behind

Neither fails loudly, which is why this list belongs in the same change as the
three files.
