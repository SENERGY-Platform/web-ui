# SENERGY Web UI

The web frontend of the SENERGY platform: an Angular application through which
users manage devices and their metadata, build dashboards, run analytics and
process flows, configure imports and exports, and administer permissions.

It is a client only — every capability it shows belongs to a platform service
behind the gateway. There is no business logic here that is not also enforced
server-side.

## What it contains

`src/app` is split three ways: `core` for cross-cutting services, `widgets` for
dashboard widgets, and `modules` for the feature areas:

| Area | Modules |
|---|---|
| Devices and data | `devices`, `metadata`, `data`, `imports`, `exports` |
| Analytics and processes | `smart-services`, `processes`, `dashboard`, `cost`, `reporting` |
| Platform and access | `admin`, `permissions`, `credentials`, `settings`, `environments`, `info` |
| API documentation | `api-doc` — embeds the services' own OpenAPI and AsyncAPI documents |

Built with Angular 18 and Angular Material 18, tested with Karma.

## Run it

```bash
npm install
npm run start_dev
```

`start_dev` renders the runtime environment first (`build-env.sh`) and then
serves. On Windows use `npm run start_dev_win`.

If it fails with

```
Error: The .../src/environments/environment.dev.ts path in file replacements does not exist.
```

create the missing file from the tracked one:

```bash
cp src/environments/environment.ts src/environments/environment.dev.ts
```

That file is generated and gitignored, which is why a fresh clone does not have
it. The three files a service URL actually lives in are tracked — see `docs/`.

## Verify a change

```bash
npm test                                              # Karma, headless, no watch
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json # fast type check, no build
npm run lint
```

## Build the image

`--build-arg branch=` selects the branch the properties-provider is built from;
the default is `master`.

```bash
docker build --build-arg branch=master -t tag:prod .
```

To develop against a local properties panel, adjust `package.json` accordingly,
then `npm install && npm run start_dev`.

## Deployment

Deployed through `rancher-2-defs`. **Pushing to `master` is already the
release**: the prod workflow tags every push and builds the image from that tag.
There is no window between merge and release — see `docs/`.

## Further documentation

`docs/` holds knowledge about this app that is not visible in the code: which
files a service URL touches, how to verify a change without a build, and what a
push to `master` triggers. Written for whoever works on it next, human or agent.
