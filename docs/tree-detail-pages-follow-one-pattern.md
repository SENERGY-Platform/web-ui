# Tree and editor pages follow one pattern

## Applies when

Writing or changing a routed page that edits a tree of objects beside a form, or a canvas editor (state of the
upgrade branch, 2026-10): aspects, report editor, environment detail (tree with detail); process designer,
smart-service designer, flow designer (editors). Lists are in `list-pages-follow-one-pattern.md`, single-object
pages in `form-pages-follow-one-pattern.md`; their rules on Enter, back links, Discard and payload pins apply
here as well.

**Not this if**: the page edits one object without a tree or canvas. That is a form page.

## Tree with detail

- `senergy-tree-detail-layout` gives the two columns: the tree and its tools (filter, expand/collapse) in
  `[treePanel]`, the selected node's form in `[detailPanel]`, stacked below 600px. It does not own the tree; each
  page keeps its tree implementation and its selection.
- A tree row shows the name as a label, markers (deprecated, unsaved dot, counts) and one row menu for the
  remaining actions in the list order, delete last in red. No form fields and no icon button columns in the row.
  A row is selectable by click and by Enter or Space (`activation` of the tree node), with `aria-selected`.
- The selected node's fields sit in `senergy-form-section` blocks. Without a selection the detail shows an
  empty state.
- One `senergy-save-bar` saves every changed part with the requests the page sent before, one each and in
  sequence; a failed request keeps its part unsaved and the others still run. Dirty state compares against what
  was loaded or last sent, so an edit made while a request is out stays unsaved.
- Actions that write at once and reload the tree (move by drop, convert) wait while anything is unsaved, and
  nothing can be edited while a save or a reload is out. Validation that spans parts (names unique across
  pending renames) blocks the save with its reason in the bar's status.
- Tabs that are the page's own navigation stay; the save bar sits outside them, so saving stays reachable from
  every tab.

## Editors

- `senergy-page-header` with `compact`: one line with back link, model name (or "New ..."), the unsaved status
  in `[pageStatus]`, actions on the right: uploads outlined, the main save filled, a second save action
  (save and release) filled and plain save outlined.
- The canvas and its side panel fill the rest of the page height. Name and description of the model live in the
  side panel, not above the canvas; view controls such as fit to screen sit on the canvas, not as FABs.
- The unsaved status follows the editor's own change signal (bpmn-js `commandStack.changed`, the diagram
  editor's `graphChange`) through `UnsavedChanges` in `processes/designer/bpmn-js/unsaved-changes.ts`: clean
  after import or load, and a save clears only the revision it exported.
