# Widget dialogs delete generated resources after saving

## Applies when

Changing the save of the device status, data table or air quality edit dialog, or of any widget dialog that creates
exports, process deployments, schedules or import instances for the widget. State of the upgrade branch (2026-10).

**Not this if**: the widget only stores its own properties (most edit dialogs, saved through `saveWidgetEdits`).

## The rule

1. Create the new resources first. Any failed step (export, deployment, schedule, import instance) stops the save: the
   widget is not stored, the dialog stays open, and an error notice names the step and the element.
2. Store the widget properties.
3. Only when the property update answered `OK`, release the candidates the stored widget no longer uses. Candidates
   are the resources of the widget as last stored (captured when the dialog opened, replaced after each successful
   save) plus everything this dialog created in any attempt, including the successful siblings of a failed batch. The
   name update does not gate this step. Releasing depends on the kind, see "Deleting".
4. What counts as "still used" is taken from the properties that were sent, not from the form at answer time: the user
   can edit the form while the request is running. Device status ignores a second save while one is running; data table
   hides the form while saving.

Elements that no longer need a deployment or schedule (no request service, refresh time 0) drop those ids, so the old
schedule stops starting its process.

## Deleting

Exports and import instances can be adopted by other widgets: air quality reuses matching ones of the user, and every
dialog that lists the user's exports (chart, single value, multi value, data table and others) can pick a generated
one. A dialog therefore hands these kinds to the deferred cleanup below instead of deleting them. Process deployments
and schedules belong to their widget only and are deleted at once, so an old schedule stops starting its process.

All deletes use the `...IfExists` variants (`ExportService.stopPipelineByIdIfExists`,
`AutomationEngineService.deleteDeploymentIfExists`, `AutomationEngineService.deleteScheduleIfExists`): a 404 means the
resource is already gone. Deployments and schedules are created and deleted in the automation-engine namespace
`processes`, which also serves the ids of those created before the engine replaced the old services. Released resources are logged before any delete request. A deployment or schedule whose
delete fails stays logged and is named in the snack with "deleting is retried later". If the log cannot store them
(no user id, storage unavailable or full), all kinds are deleted at once, checked only against the saved widget, and
the snack carries no retry note.

Resources a save attempt created are logged as soon as they exist and tracked until a property update answers OK. A
retry creates fresh resources in device status and data table and reuses matching ones in air quality. In air
quality, a create request of an aborted attempt that answers late is only recorded; it is never written into the
widget. Air quality marks an import instance or export adopted from the loaded lists as generated if the dialog created
it or the user's log has it pending, so a later change of the widget releases it again; it never adopts one the same
dialog already released. When the dialog closes without such a save (Cancel, backdrop, Escape, navigation) it waits
for a running attempt and releases what the attempts created, by the same split. Whatever a property update without
OK sent (a timeout or gateway error may still be stored, even after a later update) is never deleted in that dialog
session. Of it, what the dialog's own attempts created is logged, and the dialog also logs the resources of the widget
as last stored (see "Deferred cleanup"). The deployments and schedules the attempts created among it are named in the
close snack as kept, not as a failed delete, and without storage the exports and import instances too.
Closing is never blocked.

## Deferred cleanup

`widgets/shared/generated-resource-janitor.ts` keeps one list in localStorage (`pendingGeneratedResources`) for the
browser; each entry carries user, dashboard and widget, and a settle only handles the current user's entries. After a
property update without OK the dialog also logs the resources of the widget as last stored: if that update landed,
they are orphans. An OK save removes this widget's entries of what it sent; a successful or 404 delete removes its
entry. An import instance entry also carries the exports the dialog linked to it; linking clears the entry's mark
(see below).

It settles at app start and whenever a dialog closes, under these conditions:

- only entries untouched for 24 hours; open dialogs refresh their widget's entries on open, on every attempt and
  once a minute;
- no device status, data table or air quality dialog is open in this tab, and no other tab has a dialog marker
  (`widgetDialogTab:<id>`) written less than 3 minutes ago;
- it reads all of the user's dashboards, bypassing the client cache, and checks the conditions again after the last
  answer. An entry is dropped when its id occurs anywhere in any widget's properties, an import instance also when the
  id of a linked export does, or of any export reading from it (`Filter` is the instance id) in the user's live export
  list. That list is loaded once per settle, only if a due import instance is not referenced through its own id or its
  linked exports; the dashboards are then read a second time, and that read decides for all entries. If the list fails
  or is malformed or incomplete, no import instance is marked or deleted in that settle. A failed or malformed
  dashboards read keeps everything, and so does a 304, since the read bypasses the cache; an empty dashboard list means
  that no widget references anything;
- an unreferenced entry is first only marked and deleted at a later settle at least 10 minutes after the mark that
  finds it unreferenced again. Moving a widget between dashboards is two updates, so one read can miss it.

Not covered:

- another browser (the log is per browser) and a logout (it clears localStorage, the resources stay);
- a dialog in a tab frozen for longer than 3 minutes that uses an entry untouched for 24 hours: an adopted one, or
  after a day its own;
- every widget dialog other than device status, data table and air quality that lists the user's exports (the
  chart dialogs, single value, multi value, energy prediction, anomaly, PV prediction, PV load recommendation,
  consumption profile, leakage detection, bad ventilation): they neither block the settle nor write tab markers, so a
  settle can delete a pending export one of them has just picked but not yet saved;
- exports referenced outside widget properties, such as a dataset source of an environment or the historic data of a
  process: the settle does not see them, so it can delete a pending export used there, and a pending import instance
  whose only readers are used there or that is read directly (analytics pipelines, broker exports);
- a widget saved in the milliseconds between the last dashboards read of the deleting settle and its DELETE;
- the immediate delete when nothing can be logged (missing user id, full or unavailable storage): it checks only the
  saved widget, so it can delete an export or import instance another widget adopted.
