# Form pages follow one pattern

## Applies when

Writing or changing a routed page that creates, edits or shows one object (state of the upgrade branch,
2026-10): device groups, locations, device types, import types, operators, exports and their details, flow
deployment and its classic variant, pipeline details. Lists are in `list-pages-follow-one-pattern.md`.

**Not this if**: the page is an editor canvas, a tree with a detail form or a dashboard. A small object with
up to about six fields and no nested lists is edited in a dialog, not on a page.

## Building blocks

- `senergy-page-header`: back link to the list (`backLabel`, `backLink`), title = the stored name or
  "New <noun>", optional `description`, actions in `[pageActions]`. A read-only details page puts "Edit"
  (filled) and further navigation (outlined) there.
- `senergy-form-section`: one block per topic with `title`, optional `hint`, and add buttons or toggles in
  `[sectionActions]`. No `mat-card`, accordion or own headings around the content.
- `senergy-save-bar`: sticky at the bottom with `status`, `saveLabel`, `saveDisabled`, `discardDisabled`
  and `(save)`/`(discard)`. An extra control that belongs to saving (the operator's version field) goes into
  `[saveBarExtra]`, left of the buttons.
- The page container has a fixed height and scrolls, so the bar sticks to its bottom edge (see the operator
  page). Single-line fields get `.field-limit` (40rem); the page itself uses the full width.

## Rules

- The save action replaces any FAB or button at the end of the form. Its label says what happens ("Save",
  "Start export", "Deploy", "Update"). The bar's status names what blocks saving, else whether anything
  changed.
- No submit: no `<form (submit)>`, and every button inside a form has `type="button"`. Enter in a field
  triggers nothing.
- Back links go to the list, never history back, also when the page was opened from elsewhere.
- One page for viewing and editing: with the page's existing write right it is editable; without it the same
  page is read-only (inputs disabled or shown as text, add/remove controls hidden, no save bar). No right check
  is added where the page had none. A details page offers "Edit" under exactly the conditions the list uses.
- Discard on a new object goes back to the list. On a stored object it loads the object again: a load still in
  flight is cancelled first, the form is reset only once the reload arrived, and a failed or erroring reload
  keeps the edits (`discard()` in `new-export` and `deploy-flow`).
- Form handlers end with the form they belong to and with the page: capture the form's subject when the
  handlers are attached and combine it with `takeUntilDestroyed`, so a load that answers after the page was
  left or the form was replaced runs nothing.
- Content that used to sit in collapsed lazy panels now renders at once: give its template safe data before
  the page is ready, and keep per-call work (parsing, building markup) out of template methods or cache it.
- Payloads stay as they were: a page that writes a shared data model has specs pinning the request body, written
  against the code before the change.
- Stored SVG goes through `core/svg-image.ts` only (`stored-svg-images-go-through-one-helper.md`).
