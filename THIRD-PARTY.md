# Third-party notices

The app bundles third-party packages. Name, license and full license text of every
bundled package are generated at build time by the Angular CLI (`extractLicenses`
in `angular.json`) and shipped with the app as `/3rdpartylicenses.txt`.

This file covers what does not follow from those license texts alone. No
third-party source code is vendored into this repository.

## jointjs — MPL-2.0

Used by the diagram editor (`src/app/modules/data/diagram-editor`). The Mozilla
Public License 2.0 requires recipients to be informed how to obtain the source
code of the covered software:

    https://github.com/clientIO/joint

The bundled version is pinned in `package-lock.json`. None of its files are
modified here; if that changes, the modified files have to be made available under
the MPL as well.

## dompurify — MPL-2.0 OR Apache-2.0

Pulled in transitively by `swagger-ui`, `monaco-editor`, `posthog-js` and
`@asyncapi/react-component`. It is dual licensed and used here under the
**Apache-2.0** option, so no MPL obligation applies.

## Fonts

Roboto and Material Symbols are self-hosted under `src/assets/fonts/` and are
Google LLC, Apache-2.0. See `src/assets/fonts/LICENSE`.

## Map data

The network dialog shows an OpenStreetMap based map. Map data is ODbL-1.0 and
requires the attribution that the dialog renders (`© OpenStreetMap contributors`).
