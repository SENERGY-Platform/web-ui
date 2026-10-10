# Widget dialogs delete generated resources after saving

## Applies when

Changing the save of the device status, data table or air quality edit dialog, or of any widget dialog that creates
exports, process deployments, schedules or import instances for the widget. State of the upgrade branch (2026-10).

**Not this if**: the widget only stores its own properties (most edit dialogs, saved through `saveWidgetEdits`).

## The rule

1. Create the new resources first. Any failed step (export, deployment, schedule, import instance) stops the save: the
   widget is not stored, the dialog stays open, and an error notice names the step and the element.
2. Store the widget properties.
3. Only when the property update answered `OK`, delete the candidates the stored widget no longer uses. Candidates are
   the resources of the widget as last stored (captured when the dialog opened, replaced after each successful save)
   plus everything this dialog created in any attempt, including the successful siblings of a failed batch. The name
   update does not gate this step.
4. What counts as "still used" is taken from the properties that were sent, not from the form at answer time: the user
   can edit the form while the request is running. Device status ignores a second save while one is running; data table
   hides the form while saving.

Elements that no longer need a deployment or schedule (no request service, refresh time 0) drop those ids, so the old
schedule stops starting its process.

## Deleting

Device status and data table delete through `widgets/shared/generated-resources.ts`, which dedupes by kind and id;
air quality queues its old import instances and exports and deletes them after the save. All of them use the `...IfExists` delete variants
(`ExportService.stopPipelineByIdIfExists`, `DeploymentsService.v2deleteDeploymentIfExists`,
`ProcessSchedulerService.deleteScheduleIfExists`): a real 404 means the resource is already gone and is not reported.
Any other failure produces "The widget was saved, but the old ... could not be deleted"; the widget stays saved and the
dialog closes, and that resource is left behind, as is everything a failed attempt created when the user cancels the
dialog afterwards. Both have to be removed in the exports, deployments, schedules or imports views.
