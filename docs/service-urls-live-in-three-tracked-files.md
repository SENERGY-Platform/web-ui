# Service URLs live in three tracked files

## Applies when

Adding, renaming or removing a service URL in this app. Service URLs reach the
app as **runtime** environment variables, not as build-time constants.

**Not this if**: you found the key in `src/assets/env.json`,
`src/environments/environment.dev.ts` or `environment.prod.ts` and want to edit
it there. Those are generated and gitignored — see below.

## The three places

Adding or removing one URL touches three tracked files. Miss one and the app
falls back to `http://localhost` at runtime, which looks like a deployment
problem rather than a missing edit:

- `src/environments/environment.ts` — reads the value from `window.env`, with a
  `http://localhost` fallback
- `set-env.ts` — renders the environment variables into the runtime file
- `src/assets/env.template.json` — the template the renderer fills

## The generated files are not the source

`src/assets/env.json`, `src/environments/environment.dev.ts` and
`environment.prod.ts` carry the same values but are **gitignored** — they are
generated locally. A grep that still finds the key there after an edit is not a
sign the removal failed. Checking those first is the usual detour.

## The hardcoded permission list

`ladon.service.ts` holds a `serviceEndpoints` list of URLs whose authorizations
are checked against Ladon at startup. It is separate from the three files above
and easy to forget:

- a new service URL missing there gets **no permission preflight**
- a removed one leaves a **dead check** behind

Neither fails loudly, which is why this list belongs in the same change as the
three files.
