# swagger-ui and @asyncapi/web-component share one React

## Applies when

Updating `swagger-ui`, `@asyncapi/web-component` or React itself in this
repository.

**Not this if**: a doc page crashes for another reason — this failure mode is
specific to two React copies in the tree, and its error message names hooks or
an invalid element type, not the page.

## The constraint

Both packages embed React into the api-doc pages, and npm must be able to
dedupe them onto **one** copy:

- `swagger-ui` ≥ 5 accepts `react >=16.8 <20`
- `@asyncapi/web-component` 2.x requires `≥ 18`

A one-sided update that narrows either range splits the dependency tree into two
React copies and crashes every single-service doc page. `swagger-ui` 4 pinned
`react =17.0.2` and did exactly that.

A regression test guards the constraint — it fails when the resolved tree holds
more than one React copy, before any page has to crash.
