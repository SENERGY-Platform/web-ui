# Third-party components under their own terms

Dependencies whose licence asks for more than the permissive default this
project builds on. Everything not listed here is MIT, Apache-2.0, BSD, ISC or
equivalent and needs no notice beyond the usual attribution.

## @joint/core

| | |
|---|---|
| Version | 4.3.3 |
| Licence | MPL-2.0 (Mozilla Public License 2.0) |
| Source | https://jointjs.com, https://github.com/clientIO/joint |
| Used by | the diagram editor and the flow designer under `src/app/modules/data/` |
| Recorded | 2026-11-12 |

The MPL covers the files of the package itself, not the code that is bundled
beside them. Two things follow for a release:

- The source of the covered files stays available. It is published by the
  project at the address above; nothing is vendored or patched here, so the
  published release of the version named above is that source.
- The notice stays with the distribution. This file is it.

Modifying the package in place would add the obligation to publish those
changes under the MPL as well. Do not patch it inside `node_modules` or vendor
a changed copy without recording it here.

The allowance is configured in `.claude/license-policy.env`, which says why.
